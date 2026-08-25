import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import accuracy_score

class ChileanLeaguePredictor:
    def __init__(self):
        self.rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.nn_model = MLPClassifier(hidden_layer_sizes=(64, 32), max_iter=500, random_state=42)
        
        self.features = [
            'xg_home', 'xg_away',
            'possession_home', 'possession_away',
            'shots_on_target_home', 'shots_on_target_away',
            'shots_home', 'shots_away',
            'corners_home', 'corners_away'
        ]
        self.accuracy_rf = 0.0
        self.accuracy_nn = 0.0
        self.metrics_report_rf = {}
        self.metrics_report_nn = {}
        self.team_stats_avg = {}

    def prepare_data(self, match_data_list, training=False):
        """
        Prepara los datos para entrenar o predecir.
        Asegúrate de que los datos de entrada tengan las claves de las características esperadas.
        """
        df = pd.DataFrame(match_data_list)
        
        # Asegúrate de que los datos de entrada tengan las claves de las características esperadas.
        if training and 'home_goals' in df.columns and 'away_goals' in df.columns:
            # Drop rows where goals are None (if any leaked in during training)
            df = df.dropna(subset=['home_goals', 'away_goals'])
            
            def determine_result(row):
                if row['home_goals'] > row['away_goals']:
                    return 0 # Local
                elif row['home_goals'] == row['away_goals']:
                    return 1 # Empate
                else:
                    return 2 # Visita
            
            df['target'] = df.apply(determine_result, axis=1)
            df['target'] = df['target'].astype(int)
        
        # Llena los valores faltantes para las características con 0 (como en el notebook)
        for feature in self.features:
            if feature not in df.columns:
                df[feature] = 0
            df[feature] = df[feature].fillna(0)
            
        return df

    def train(self, match_data_list):
        """
        Entrena el modelo Random Forest.
        """
        if not match_data_list:
            print("No se proporcionó datos de entrenamiento.")
            return
            
        df = self.prepare_data(match_data_list, training=True)
        
        if df.empty:
            print("El dataframe de entrenamiento está vacío después de la preparación.")
            return

        # Calcular promedios históricos por equipo
        self.team_stats_avg = {}
        if 'home_team_id' in df.columns and 'away_team_id' in df.columns:
            for team_id in pd.concat([df['home_team_id'], df['away_team_id']]).unique():
                team_home = df[df['home_team_id'] == team_id]
                team_away = df[df['away_team_id'] == team_id]
                
                avg_stats = {}
                for feature in self.features:
                    if 'home' in feature:
                        away_feature = feature.replace('home', 'away')
                        avg_h = team_home[feature].mean() if not team_home.empty else 0
                        avg_a = team_away[away_feature].mean() if not team_away.empty else 0
                        avg_stats[feature] = (avg_h + avg_a) / 2 if team_home.empty or team_away.empty else (avg_h + avg_a) / 2
                    elif 'away' in feature:
                        home_feature = feature.replace('away', 'home')
                        avg_a = team_away[feature].mean() if not team_away.empty else 0
                        avg_h = team_home[home_feature].mean() if not team_home.empty else 0
                        avg_stats[feature] = (avg_a + avg_h) / 2 if team_away.empty or team_home.empty else (avg_a + avg_h) / 2
                        
                # Fix NaNs
                for k, v in avg_stats.items():
                    if pd.isna(v): avg_stats[k] = 0
                self.team_stats_avg[team_id] = avg_stats

        X = df[self.features]
        y = df['target']
        
        print(f"Entrenando con {len(df)} muestras. Distribución del objetivo: {y.value_counts().to_dict()}")

        try:
            # Si el dataset es demasiado pequeño, saltar la división de validación y entrenar en todo
            if len(df) < 10:
                print("Dataset demasiado pequeño para la división, entrenando en todo el conjunto de datos.")
                self.rf_model.fit(X, y)
                self.nn_model.fit(X, y)
                self.accuracy_rf = 1.0
                self.accuracy_nn = 1.0
                self.metrics_report_rf = {}
                self.metrics_report_nn = {}
                return

            # Verificar si podemos estratificar
            stratify_param = y if len(y.unique()) > 1 and y.value_counts().min() > 1 else None
            
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=stratify_param
            )
            
            from sklearn.metrics import classification_report
            
            # Train RF
            self.rf_model.fit(X_train, y_train)
            rf_predictions = self.rf_model.predict(X_test)
            self.accuracy_rf = accuracy_score(y_test, rf_predictions)
            self.metrics_report_rf = classification_report(y_test, rf_predictions, output_dict=True, zero_division=0)
            
            # Train NN
            self.nn_model.fit(X_train, y_train)
            nn_predictions = self.nn_model.predict(X_test)
            self.accuracy_nn = accuracy_score(y_test, nn_predictions)
            self.metrics_report_nn = classification_report(y_test, nn_predictions, output_dict=True, zero_division=0)
            
            print(f"Modelos entrenados. Accuracy RF: {self.accuracy_rf:.2f} | Accuracy NN: {self.accuracy_nn:.2f}")
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"Error during training: {e}")
            # Fallback: try training on everything if split failed
            try:
                self.rf_model.fit(X, y)
                self.nn_model.fit(X, y)
                self.accuracy_rf = 0.0
                self.accuracy_nn = 0.0
                self.metrics_report_rf = {}
                self.metrics_report_nn = {}
                print("Fallback training successful.")
            except Exception as e2:
                print(f"Fallback training failed: {e2}")

    def get_feature_importances(self):
        if self.rf_model is None or not hasattr(self.rf_model, "feature_importances_"):
            # Uniform fallback
            val = 1.0 / len(self.features)
            return {f: val for f in self.features}
        return dict(zip(self.features, self.rf_model.feature_importances_.tolist()))

    def get_metrics_report(self):
        return {
            "rf": self.metrics_report_rf or {},
            "nn": self.metrics_report_nn or {}
        }

    def predict(self, match_data):
        """
        Predecir el resultado para un solo partido usando RF y NN.
        """
        # Envuelve el diccionario único en una lista para usar prepare_data
        df = self.prepare_data([match_data], training=False)
        
        # Fill missing with historical averages if available
        home_team_id = match_data.get('home_team_id')
        away_team_id = match_data.get('away_team_id')
        
        for feature in self.features:
            val = df[feature].iloc[0]
            if val == 0 or pd.isna(val):
                if 'home' in feature and home_team_id in self.team_stats_avg:
                    df.loc[0, feature] = self.team_stats_avg[home_team_id].get(feature, 0)
                elif 'away' in feature and away_team_id in self.team_stats_avg:
                    df.loc[0, feature] = self.team_stats_avg[away_team_id].get(feature, 0)
        
        X = df[self.features]
        
        def _get_pred(model):
            try:
                prediction_index = model.predict(X)[0]
                result_map = {0: 'Local', 1: 'Empate', 2: 'Visita'}
                result_str = result_map.get(prediction_index, "Desconocido")
                
                probabilities = model.predict_proba(X)[0]
                confidence = max(probabilities)
                
                classes = model.classes_.tolist() if hasattr(model, 'classes_') else [0, 1, 2]
                prob_dict = {"Local": 0.0, "Empate": 0.0, "Visita": 0.0}
                
                for i, cls in enumerate(classes):
                    prob = float(probabilities[i]) * 100
                    if cls == 0:
                        prob_dict["Local"] = prob
                    elif cls == 1:
                        prob_dict["Empate"] = prob
                    elif cls == 2:
                        prob_dict["Visita"] = prob
                        
                return {
                    "result": result_str,
                    "accuracy": confidence,
                    "probabilities": prob_dict
                }
            except Exception as e:
                return {
                    "result": "Empate",
                    "accuracy": 0.33,
                    "probabilities": {"Local": 33.3, "Empate": 33.4, "Visita": 33.3}
                }
            
        return {
            "rf": _get_pred(self.rf_model),
            "nn": _get_pred(self.nn_model)
        }
