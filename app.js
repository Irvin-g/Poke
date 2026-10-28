const form = document.getElementById("pokemon-form");
const input = document.getElementById("pokemon-name");
const message = document.getElementById("message");
const result = document.getElementById("result");

form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const pokemon = input.value.trim().toLowerCase();

    if (!pokemon) {
        message.textContent = "Escribe un Pokémon.";
        return;
    }

    message.textContent = "Buscando...";
    result.hidden = true;

    try {
        const response = await fetch(
            `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(pokemon)}`
        );

        if (!response.ok) {
            throw new Error("Pokémon no encontrado");
        }

        const data = await response.json();

        document.getElementById("name").textContent =
            data.name.toUpperCase();

        document.getElementById("image").src =
            data.sprites.front_default;

        document.getElementById("type").textContent =
            "Tipo: " + data.types
                .map(item => item.type.name)
                .join(", ");

        document.getElementById("height").textContent =
            "Altura: " + data.height / 10 + " m";

        document.getElementById("weight").textContent =
            "Peso: " + data.weight / 10 + " kg";

        message.textContent = "";
        result.hidden = false;

    } catch (error) {
        message.textContent = error.message ===
            "Pokémon no encontrado"
            ? "No se encontró ese Pokémon."
            : "Ocurrió un error al consultar el servicio.";

        console.error(error);
    }
});
