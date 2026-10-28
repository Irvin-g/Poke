"use strict";

const API_BASE = "https://pokeapi.co/api/v2/";

const apiCache = new Map();

async function apiGet(url) {
  if (apiCache.has(url)) {
    return apiCache.get(url);
  }

  const request = fetch(url).then(async (response) => {
    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status} al consultar la API.`);
    }

    return response.json();
  });

  // También se guarda la promesa para evitar solicitudes simultáneas duplicadas.
  apiCache.set(url, request);

  try {
    return await request;
  } catch (error) {
    apiCache.delete(url);
    throw error;
  }
}

async function getSpeciesList() {
  const data = await apiGet(`${API_BASE}pokemon-species?limit=2000`);

  return data.results.sort((a, b) =>
    a.name.localeCompare(b.name, "en", { sensitivity: "base" })
  );
}

async function getPokemon(name) {
  return apiGet(`${API_BASE}pokemon/${encodeURIComponent(name)}`);
}

async function getPokemonSpecies(name) {
  return apiGet(
    `${API_BASE}pokemon-species/${encodeURIComponent(name)}`
  );
}

async function getTypesList() {
  const data = await apiGet(`${API_BASE}type`);

  return data.results
    .map((item) => item.name)
    .filter((name) => !["unknown", "shadow"].includes(name))
    .sort((a, b) => a.localeCompare(b));
}

async function getSpeciesByType(type) {
  const data = await apiGet(
    `${API_BASE}type/${encodeURIComponent(type)}`
  );

  return new Set(
    data.pokemon.map((item) => item.pokemon.name)
  );
}

async function getSpeciesByGeneration(generation) {
  const data = await apiGet(
    `${API_BASE}generation/${Number(generation)}`
  );

  return new Set(
    data.pokemon_species.map((item) => item.name)
  );
}

function getGenerationNumber(generationName) {
  const match = generationName?.match(/generation-(\d+)/);
  return match ? Number(match[1]) : null;
}

function getGenerationLabel(generationNumber) {
  const roman = [
    "", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"
  ];

  return roman[generationNumber]
    ? `Generación ${roman[generationNumber]}`
    : "Desconocida";
}

function getPokemonImage(pokemon) {
  return (
    pokemon.sprites.other?.["official-artwork"]?.front_default ||
    pokemon.sprites.front_default ||
    ""
  );
}

function getSpanishDescription(species) {
  const entry = species.flavor_text_entries?.find(
    (item) => item.language.name === "es"
  );

  return entry
    ? entry.flavor_text.replace(/[\n\f]/g, " ")
    : "";
}

function getSpanishHabitat(species) {
  return species.habitat?.name || "";
}
