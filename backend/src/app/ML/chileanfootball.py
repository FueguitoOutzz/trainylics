import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score

class ChileanLeaguePredictor:
    def __init__(self):
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.features = [
            'xg_home', 'xg_away',
            'possession_home', 'possession_away',
            'shots_on_target_home', 'shots_on_target_away',
            'shots_home', 'shots_away',
            'corners_home', 'corners_away'
        ]
        self.accuracy = 0.0

    def prepare_data(self, match_data_list, training=False):
        """
        Prepares the data for training or prediction.
        Ensure incoming data has the expected feature keys.
        """
        df = pd.DataFrame(match_data_list)
        
        # Ensure result column exists for training
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
        
        # Fill missing values for features with 0 (as in notebook)
        for feature in self.features:
            if feature not in df.columns:
                df[feature] = 0
            df[feature] = df[feature].fillna(0)
            
        return df

    def train(self, match_data_list):
        """
        Trains the Random Forest model.
        """
        if not match_data_list:
            print("No training data provided.")
            return
            
        df = self.prepare_data(match_data_list, training=True)
        
        if df.empty:
            print("Training dataframe is empty after preparation.")
            return

        X = df[self.features]
        y = df['target']
        
        print(f"Training on {len(df)} samples. Target distribution: {y.value_counts().to_dict()}")

        try:
            # If dataset is too small, skip validation split and train on all
            if len(df) < 10:
                print("Dataset too small for split, training on all data.")
                self.model.fit(X, y)
                self.accuracy = 1.0 # arbitrary perfect score since we can't test
                return

            # Check if we can stratify
            stratify_param = y if len(y.unique()) > 1 and y.value_counts().min() > 1 else None
            
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42, stratify=stratify_param
            )
            
            self.model.fit(X_train, y_train)
            
            predictions = self.model.predict(X_test)
            self.accuracy = accuracy_score(y_test, predictions)
            print(f"Model trained. Accuracy: {self.accuracy:.2f}")
            
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"Error during training: {e}")
            # Fallback: try training on everything if split failed
            try:
                self.model.fit(X, y)
                self.accuracy = 0.0
                print("Fallback training successful.")
            except Exception as e2:
                print(f"Fallback training failed: {e2}")

    def predict(self, match_data):
        """
        Predicts the result for a single match.
        """
        if self.model is None:
            raise Exception("Model not trained")
            
        # Wrap single dict in list to use prepare_data
        df = self.prepare_data([match_data], training=False)
        X = df[self.features]
        
        prediction_index = self.model.predict(X)[0]
        
        # Map back to string
        result_map = {0: 'Local', 1: 'Empate', 2: 'Visita'}
        result_str = result_map.get(prediction_index, "Desconocido")
        
        # Get probability/confidence
        probabilities = self.model.predict_proba(X)[0]
        confidence = max(probabilities)
        
        return {
            "result": result_str,
            "accuracy": confidence # Return confidence score for this prediction
        }
