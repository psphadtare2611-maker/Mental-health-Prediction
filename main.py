import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Annotated, Literal

import joblib
import pandas as pd
from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, StringConstraints
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("mental_health_api")

# Resolve the model next to this file so the app works from any working directory
MODEL_PATH = Path(__file__).resolve().parent / 'Mental_Health_Model.pkl'

# The 10 most frequent countries in the training data (notebook: value_counts().index[:10]);
# every other country is grouped as "Other", exactly like group_countries() in the notebook
top_countries = ['Other','India','USA','Canada','Australia','UK','Germany','Mexico','Turkey','France']
_country_lookup = {c.lower(): c for c in top_countries}

DISCLAIMER = ("This score is an informational estimate from a machine learning model trained on survey data. "
              "It is not a clinical diagnosis or a substitute for a qualified mental health professional.")

# Local dev origins for the static frontend (python -m http.server 5500 / VS Code Live Server).
# Add a deployed frontend origin with: CORS_ORIGINS="https://your-site.example,http://127.0.0.1:5500"
DEFAULT_CORS_ORIGINS = "http://127.0.0.1:5500,http://localhost:5500"
cors_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", DEFAULT_CORS_ORIGINS).split(",") if o.strip()]


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the trained pipeline (preprocessor + RandomForest) once at startup
    app.state.model = joblib.load(MODEL_PATH)
    logger.info("Loaded model from %s", MODEL_PATH.name)
    yield


app = FastAPI(title="Mental Health Score Predictor", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


#A first Pydantic Model
class StudentData(BaseModel):
    age                     : int = Field(..., ge=10, le=100)
    gender                  : Literal['Male', 'Female']
    country                 : Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=60)]
    academic_level          : Literal['Undergraduate', 'Graduate', 'High School']
    most_used_platform      : Literal['Facebook', 'LinkedIn', 'Instagram', 'Snapchat','Twitter','YouTube', 'TikTok', 'LINE', 'KakaoTalk', 'VKontakte', 'WhatsApp','WeChat']
    purpose_of_use          : Literal['Networking', 'Education', 'Entertainment', 'News']
    avg_daily_usage_hours   : float = Field(..., ge=0, le=24)
    daily_unlocks           : int   = Field(..., ge=0)
    study_hours             : float = Field(..., ge=0, le=24)
    physical_activity_hours : float = Field(..., ge=0, le=24)
    sleep_hours_per_night   : float = Field(..., ge=0, le=24)
    stress_level            : Literal['Medium', 'Low', 'Very High', 'High']




# Describe what we send back
class PredictionResponse(BaseModel):
    success                       : bool = True
    predicted_mental_health_score : float
    #6.777777 -> float
    message                       : str = "Prediction generated successfully"
    disclaimer                    : str = DISCLAIMER


def error_response(status_code: int, message: str, detail=None) -> JSONResponse:
    content = {'success': False, 'message': message}
    if detail is not None:
        content['detail'] = detail
    return JSONResponse(status_code=status_code, content=jsonable_encoder(content))


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    # Keep FastAPI's per-field "detail" list so the frontend can mark individual fields
    errors = [{'loc': e.get('loc'), 'msg': e.get('msg'), 'type': e.get('type')} for e in exc.errors()]
    return error_response(422, "Some inputs are missing or invalid.", errors)


@app.exception_handler(StarletteHTTPException)
async def http_error_handler(request: Request, exc: StarletteHTTPException):
    return error_response(exc.status_code, str(exc.detail))


def group_country(country: str) -> str:
    # Case-insensitive match so "india" or "usa" map to the same group the model was trained on
    return _country_lookup.get(country.lower(), 'Other')


@app.get('/')
def greet():
    return {'Welcome Guys I am Paras'}


@app.post('/predict', response_model=PredictionResponse) #6.77777
def predict(data: StudentData, request: Request):
   model = request.app.state.model

   # Only the features the pipeline was trained on (raw Country is not a model feature)
   features = {
        'Age'                       :data.age,
        'Gender'                    :data.gender,
        'Academic_Level'            :data.academic_level,
        'Most_Used_Platform'        :data.most_used_platform,
        'Purpose_Of_Use'            :data.purpose_of_use,
        'Avg_Daily_Usage_Hours'     :data.avg_daily_usage_hours,
        'Daily_Unlocks'             :data.daily_unlocks,
        'Study_Hours'               :data.study_hours,
        'Physical_Activity_Hours'   :data.physical_activity_hours,
        'Sleep_Hours_Per_Night'     :data.sleep_hours_per_night,
        'Stress_Level'              :data.stress_level,
        'Grouped_country'           :group_country(data.country)
   }

   try:
        # Column order taken from the fitted pipeline itself, so it always matches training
        input_row  = pd.DataFrame([features])[list(model.feature_names_in_)]
        prediction = model.predict(input_row)[0] #6.77
   except Exception:
        logger.exception("Prediction failed")
        return error_response(500, "The model could not generate a prediction for this input.")

   return PredictionResponse(predicted_mental_health_score=round(float(prediction),2))
