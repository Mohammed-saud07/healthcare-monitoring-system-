import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
from app.services.firebase import init_firebase

load_dotenv(
    os.path.abspath(
        os.path.join(os.path.dirname(__file__), "..", ".env")
    )
)


def create_app():
    from app.routes.patients import patients_bp
    app = Flask(__name__)
    init_firebase()
    app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY", "change-me")
    CORS(app)

    from app.routes.vitals import vitals_bp
    from app.routes.alerts import alerts_bp
    from app.routes.auth import auth_bp
    from app.routes.thresholds import thresholds_bp

    app.register_blueprint(vitals_bp)
    app.register_blueprint(alerts_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(thresholds_bp)
    app.register_blueprint(patients_bp)

    @app.route("/health")
    def health():
        return {"status": "ok"}, 200

    return app
