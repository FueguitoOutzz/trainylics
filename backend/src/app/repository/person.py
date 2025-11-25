from src.app.model.person import Person
from src.app.repository.base_repo import BaseRepo

class PersonRepo(BaseRepo):
    model = Person