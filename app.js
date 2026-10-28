"use strict";

const { createApp, ref, computed, watch, onMounted } = Vue;

createApp({
  setup() {
    const speciesList = ref([]);
    const types = ref([]);

    const search = ref("");
    const selectedType = ref("");
    const selectedGeneration = ref("");
    const pageSize = ref(10);
    const currentPage = ref(1);

    const loading = ref(true);
    const error = ref("");
    const detailLoading = ref(false);
    const detailError = ref("");
    const selectedPokemon = ref(null);
    const detail = ref(null);

    // Información de los Pokémon que ya se han consultado.
    const rowData = ref({});

    // null significa que no hay filtros de tipo ni generación.
    const eligibleNames = ref(null);
    let filterRequestId = 0;

    const generations = [
      { id: 1, label: "Generación I" },
      { id: 2, label: "Generación II" },
      { id: 3, label: "Generación III" },
      { id: 4, label: "Generación IV" },
      { id: 5, label: "Generación V" },
      { id: 6, label: "Generación VI" },
      { id: 7, label: "Generación VII" },
      { id: 8, label: "Generación VIII" },
      { id: 9, label: "Generación IX" }
    ];

    const filteredPokemon = computed(() => {
      const query = search.value.toLocaleLowerCase().trim();

      return speciesList.value.filter((species) => {
        const matchesName =
          !query || species.name.toLocaleLowerCase().includes(query);

        const matchesType =
          eligibleNames.value === null ||
          eligibleNames.value.has(species.name);

        return matchesName && matchesType;
      });
    });

    const totalPages = computed(() =>
      Math.max(1, Math.ceil(filteredPokemon.value.length / pageSize.value))
    );

    const visibleSpecies = computed(() => {
      const start = (currentPage.value - 1) * pageSize.value;

      return filteredPokemon.value.slice(
        start,
        start + pageSize.value
      );
    });

    const visiblePokemon = computed(() =>
      visibleSpecies.value.map((species) =>
        rowData.value[species.name] || {
          name: species.name,
          id: null,
          image: "",
          generation: "",
          types: [],
          height: null,
          weight: null
        }
      )
    );

    function capitalize(value) {
      if (!value) return "";
      return value.charAt(0).toUpperCase() + value.slice(1);
    }

    async function buildPokemonRow(name) {
      const [pokemon, species] = await Promise.all([
        getPokemon(name),
        getPokemonSpecies(name)
      ]);

      const generationNumber = getGenerationNumber(
        species.generation?.name
      );

      return {
        id: pokemon.id,
        name: pokemon.name,
        image: getPokemonImage(pokemon),
        generation: generationNumber
          ? `Gen. ${generationNumber}`
          : "",
        generationNumber,
        types: pokemon.types
          .map((item) => item.type.name)
          .sort(),
        height: pokemon.height,
        weight: pokemon.weight
      };
    }

    async function loadVisibleDetails() {
      const names = visibleSpecies.value.map((species) => species.name);

      await Promise.all(
        names.map(async (name) => {
          if (rowData.value[name]) return;

          try {
            const row = await buildPokemonRow(name);
            rowData.value[name] = row;
          } catch (err) {
            // Mantiene el resultado visible aunque falle una consulta.
            rowData.value[name] = {
              name,
              id: null,
              image: "",
              generation: "",
              types: [],
              height: null,
              weight: null
            };

            console.error(`No se pudo cargar ${name}:`, err);
          }
        })
      );
    }

    async function refreshFilterData() {
      const requestId = ++filterRequestId;
      const type = selectedType.value;
      const generation = selectedGeneration.value;

      try {
        if (!type && !generation) {
          eligibleNames.value = null;
          return;
        }

        const requests = [];

        if (type) requests.push(getSpeciesByType(type));
        if (generation) {
          requests.push(getSpeciesByGeneration(generation));
        }

        const sets = await Promise.all(requests);

        if (requestId !== filterRequestId) return;

        let result = sets[0];

        for (let index = 1; index < sets.length; index++) {
          result = new Set(
            [...result].filter((name) => sets[index].has(name))
          );
        }

        eligibleNames.value = result;
      } catch (err) {
        if (requestId === filterRequestId) {
          error.value =
            "No fue posible aplicar los filtros. Comprueba tu conexión e inténtalo nuevamente.";
          console.error(err);
        }
      }
    }

    function resetFilters() {
      search.value = "";
      selectedType.value = "";
      selectedGeneration.value = "";
      currentPage.value = 1;
      error.value = "";
    }

    async function loadInitialData() {
      loading.value = true;
      error.value = "";

      try {
        const [species, availableTypes] = await Promise.all([
          getSpeciesList(),
          getTypesList()
        ]);

        speciesList.value = species;
        types.value = availableTypes;
      } catch (err) {
        error.value =
          "No se pudo conectar con PokéAPI. Revisa tu conexión a Internet y vuelve a intentarlo.";
        console.error(err);
      } finally {
        loading.value = false;
      }
    }

    async function retry() {
      rowData.value = {};
      eligibleNames.value = null;
      await loadInitialData();
    }

    async function openDetails(pokemon) {
      selectedPokemon.value = pokemon;
      detail.value = null;
      detailError.value = "";
      detailLoading.value = true;

      const modalElement = document.getElementById("pokemonModal");
      const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
      modal.show();

      try {
        // Se reutilizan las respuestas almacenadas en api.js.
        const [data, species] = await Promise.all([
          getPokemon(pokemon.name),
          getPokemonSpecies(pokemon.name)
        ]);

        const generationNumber = getGenerationNumber(
          species.generation?.name
        );

        detail.value = {
          id: data.id,
          name: data.name,
          image: getPokemonImage(data),
          types: data.types.map((item) => item.type.name),
          height: data.height,
          weight: data.weight,
          generation: generationNumber
            ? `Generación ${generationNumber}`
            : "",
          baseExperience: data.base_experience,
          habitat: getSpanishHabitat(species),
          description: getSpanishDescription(species),
          abilities: data.abilities.map((item) =>
            item.ability.name.replaceAll("-", " ")
          ),
          stats: data.stats.map((item) => ({
            name: capitalize(
              item.stat.name.replaceAll("-", " ")
            ),
            value: item.base_stat
          }))
        };

        // Conserva los datos ya consultados para el listado.
        rowData.value[data.name] = {
          ...rowData.value[data.name],
          id: data.id,
          name: data.name,
          image: getPokemonImage(data),
          generation: generationNumber
            ? `Gen. ${generationNumber}`
            : "",
          generationNumber,
          types: data.types.map((item) => item.type.name),
          height: data.height,
          weight: data.weight
        };
      } catch (err) {
        detailError.value =
          "No se pudieron cargar los detalles de este Pokémon.";
        console.error(err);
      } finally {
        detailLoading.value = false;
      }
    }

    // Reinicia la paginación cuando cambia cualquier filtro.
    watch(
      [search, selectedType, selectedGeneration, pageSize],
      () => {
        currentPage.value = 1;
      }
    );

    // Consulta los nombres de tipo y generación solo al cambiar los filtros.
    watch([selectedType, selectedGeneration], refreshFilterData);

    // Carga solo los datos de las filas de la página actual.
    watch(
      () => visibleSpecies.value.map((species) => species.name).join("|"),
      loadVisibleDetails
    );

    onMounted(loadInitialData);

    return {
      types,
      generations,
      search,
      selectedType,
      selectedGeneration,
      pageSize,
      currentPage,
      loading,
      error,
      detailLoading,
      detailError,
      selectedPokemon,
      detail,
      filteredPokemon,
      visiblePokemon,
      totalPages,
      capitalize,
      resetFilters,
      retry,
      openDetails
    };
  }
}).mount("#app");
