from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
from sklearn.metrics import confusion_matrix, ConfusionMatrixDisplay
import matplotlib.pyplot as plt
import pandas as pd

INPUT_FILE = '/content/liga_chile_2025_dataset_limpio.csv'

df = pd.read_csv(INPUT_FILE)

df

def determine_result(row):
        if row['Goles_Local'] > row['Goles_Visitante']:
            return 1
        elif row['Goles_Local'] == row['Goles_Visitante']:
            return 2
        else:
            return 3

df['Target'] = df.apply(determine_result, axis=1)

display(df.head())

features = [
        'Posesion_Local', 'Posesion_Visitante',
        'Disparos_Totales_Local', 'Disparos_Totales_Visitante',
        'Disparos_a_Puerta_Local', 'Disparos_a_Puerta_Visitante',
        'Corners_Local', 'Corners_Visitante'
    ]

df[features] = df[features].fillna(0)

X = df[features]
y = df['Target']

X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

clf = RandomForestClassifier(n_estimators=100, random_state=42)
clf.fit(X_train, y_train)

y_pred = clf.predict(X_test)

accuracy_score(y_test, y_pred)

cm = confusion_matrix(y_test, y_pred)
disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=['Local', 'Empate', 'Visita'])
disp.plot(cmap=plt.cm.Blues)
plt.title("Matriz de Confusión: Predicción Liga 2025")
plt.show()

print("\nReporte Detallado:")
print(classification_report(y_test, y_pred, target_names=['Gana Local', 'Empate', 'Gana Visitante']))