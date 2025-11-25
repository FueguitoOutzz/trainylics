from datetime import datetime, timedelta
from jose import jwt
from typing import Optional, Dict, Any

from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.config import SECRET_KEY, ALGORITHM


class JWTRepo:

    def __init__(self, data: Optional[Dict[str, Any]] = None, token: Optional[str] = None) -> None:
        self.data = data or {}
        self.token = token

    def generate_token(self, expires_delta: Optional[timedelta] = None) -> str:
        to_encode = self.data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=15)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt

    def decode_token(self) -> Optional[Dict[str, Any]]:
        if not self.token:
            return None
        try:
            decoded_jwt = jwt.decode(self.token, SECRET_KEY, algorithms=[ALGORITHM])
            return decoded_jwt
        except Exception:
            return None

    @staticmethod
    def extract_token(token: str) -> Optional[Dict[str, Any]]:
        try:
            return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        except Exception:
            return None


class JWTbearer(HTTPBearer):

    def __init__(self, auto_error: bool = True):
        super(JWTbearer, self).__init__(auto_error=auto_error)

    async def __call__(self, request: Request):
        credentials: HTTPAuthorizationCredentials = await super(JWTbearer, self).__call__(request)
        if credentials:
            if credentials.scheme.lower() != "bearer":
                raise HTTPException(status_code=403, detail="Autenticacion invalida.")
            jwt_repo = JWTRepo(token=credentials.credentials)
            if not jwt_repo.decode_token():
                raise HTTPException(status_code=403, detail="Token invalido o expirado.")
            return credentials.credentials
        raise HTTPException(status_code=403, detail="Codigo de autorizacion invalido.")

    @staticmethod
    def verify_jwt(jwtoken: str) -> bool:
        try:
            return jwt.decode(jwtoken, SECRET_KEY, algorithms=[ALGORITHM]) is not None
        except Exception:
            return False