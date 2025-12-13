
import logging
from typing import Optional, TypeVar
from fastapi import HTTPException
from pydantic import BaseModel, validator

from app.model.person import Sex



T = TypeVar('T')

logger = logging.getLogger("app.schema")

class RegisterSchema(BaseModel):
    username: str
    email: str
    name: str
    password: str
    phone_number: str
    birth: str
    sex: str
    profile: str ="base64"
    
    @validator('phone_number')
    def validate_phone_number(cls, v):
        # Telefono chileno: +569XXXXXXXX
        if not v.startswith("+569") or len(v) != 12 or not v[1:].isdigit():
            raise HTTPException(status_code=400, detail="Número de teléfono inválido. Debe comenzar con +569 y tener 12 dígitos.")
        return v
    
    @validator('sex')
    def sex_validation(cls, v):
        # Accept values defined by the Sex enum
        if v not in {member.value for member in Sex}:
            raise HTTPException(status_code=400, detail="Sexo inválido, usar Hombre o Mujer.")
        return v
    
    
class LoginSchema(BaseModel):
    username: str
    password: str
    
class ForgotPasswordSchema(BaseModel):
    email: str
    new_password: str

class DetailSchema(BaseModel):
    status: str
    message: str
    result: Optional[T] = None
    
class ResponseSchema(BaseModel):
    detail: str
    result: Optional[T] = None