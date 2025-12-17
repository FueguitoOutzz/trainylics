import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class FootballPredictor:
    def __init__(self):
        self.model = None
        self.features = [
            'Posesion_Local', 'Posesion_Visitante',
            'Disparos_Totales_Local', 'Disparos_Totales_Visitante',
            'Disparos_a_Puerta_Local', 'Disparos_a_Puerta_Visitante',
            'Corners_Local', 'Corners_Visitante'
        ]
        # Path relative to this file: ../data/filename.csv
        self.data_path = Path(__file__).resolve().parent.parent / "data" / "liga_chile_2025_dataset_limpio.csv"

    def _determine_result(self, row):
        if row['Goles_Local'] > row['Goles_Visitante']:
            return 1 # Local
        elif row['Goles_Local'] == row['Goles_Visitante']:
            return 2 # Empate
        else:
            return 3 # Visita

    def train(self):
        """entrena el modelo y devuelve metricas"""
        if not self.data_path.exists():
            raise FileNotFoundError(f"Dataset not found at {self.data_path}")

        logger.info(f"Loading dataset from {self.data_path}")
        df = pd.read_csv(self.data_path)
        
        # Target generation
        df['Target'] = df.apply(self._determine_result, axis=1)
        
        # Feature selection and clearing
        df[self.features] = df[self.features].fillna(0)
        
        X = df[self.features]
        y = df['Target']
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.model.fit(X_train, y_train)
        
        y_pred = self.model.predict(X_test)
        self.accuracy = accuracy_score(y_test, y_pred)
        
        logger.info(f"Model trained with accuracy: {self.accuracy}")
        return {"accuracy": self.accuracy, "status": "trained"}

    def predict(self, match_data: dict):
        """Realiza una prediccion basada en los datos del partido recibidos"""
        if not self.model:
            logger.info("Model not trained, training now...")
            self.train() 
            
        # Ensure input data has the correct order and columns
        # Filter only expected features from input
        filtered_data = {k: match_data.get(k, 0) for k in self.features}
        
        input_df = pd.DataFrame([filtered_data], columns=self.features)
        input_df = input_df.fillna(0)
        
        prediction = self.model.predict(input_df)[0]
        
        result_map = {1: "Local", 2: "Empate", 3: "Visita"}
        return {
            "result": result_map.get(prediction, "Unknown"),
            "accuracy": self.accuracy if hasattr(self, 'accuracy') else 0.0
        }

predictor = FootballPredictor()
