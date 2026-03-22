from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pickle
import pandas as pd

# Create FastAPI app
app = FastAPI()

# Enable CORS (so frontend can call backend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load pickle files
movies = pickle.load(open("movies.pkl", "rb"))
similarity = pickle.load(open("similarity.pkl", "rb"))

# Recommendation function
def recommend(movie_name: str):
    movie_index = movies[movies["title"] == movie_name].index[0]
    distances = similarity[movie_index]
    movie_list = sorted(
        list(enumerate(distances)),
        reverse=True,
        key=lambda x: x[1]
    )[1:6]

    recommended_movies = []

    for i in movie_list:
        recommended_movies.append({
            "title": movies.iloc[i[0]].title,
            "poster": "https://image.tmdb.org/t/p/w500/sample.jpg"
        })

    return recommended_movies


# API Route
@app.get("/recommend/{movie_name}")
def get_recommendations(movie_name: str):
    try:
        return recommend(movie_name)
    except:
        return {"error": "Movie not found"}