const store = {
  track_id: undefined,
  player_id: undefined,
  race_id: undefined,
  tracks: [],
  racers: [],
};

document.addEventListener("DOMContentLoaded", function () {
  onPageLoad();
  setupClickHandlers();
});

async function onPageLoad() {
  try {
    store.tracks = await getTracks();
    const htmlTracks = renderTrackCards(store.tracks);
    renderAt("#tracks", htmlTracks);

    store.racers = await getRacers();
    const htmlRacers = renderRacerCars(store.racers);
    renderAt("#racers", htmlRacers);
  } catch (error) {
    console.log("Problem getting tracks and racers ::", error.message);
    console.error(error);
  }
}

function setupClickHandlers() {
  document.addEventListener(
    "click",
    function (event) {
      const { target } = event;

      if (target.matches(".card.track")) {
        handleSelectTrack(target);
      } else if (target.matches(".card.podracer")) {
        handleSelectPodRacer(target);
      } else if (target.matches("#submit-create-race")) {
        event.preventDefault();
        handleCreateRace();
      } else if (target.matches("#gas-peddle")) {
        handleAccelerate(target);
      }
    },
    false
  );
}

async function delay(ms) {
  try {
    return await new Promise((resolve) => setTimeout(resolve, ms));
  } catch (error) {
    console.log("an error shouldn't be possible here");
    console.log(error);
  }
}

async function handleCreateRace() {
  const track = store.tracks.find(
    (track) => parseInt(track.id) === parseInt(store.track_id)
  );

  renderAt("#race", renderRaceStartView(track));

  const { player_id, track_id } = store;

  try {
    const race = await createRace(player_id, track_id);

    // fix for issue: https://github.com/udacity/nd032-c3-asynchronous-programming-with-javascript-project-starter/issues/6
    store.race_id = parseInt(race.ID) - 1;

    await runCountdown();

    await startRace(store.race_id);

    await runRace(store.race_id);
  } catch (error) {
    console.error("an error occured", error.message);
  }
}

function runRace(raceID) {
  return new Promise((resolve) => {
    const raceInterval = setInterval(function () {
      getRace(raceID)
        .then((res) => {
          if (res.status === "in-progress") {
            renderAt("#leaderBoard", renderRaceProgress(res.positions));
          }
          return res;
        })
        .then((res) => {
          if (res.status === "finished") {
            clearInterval(raceInterval);
            renderAt("#race", renderResultsView(res.positions));
            resolve(res);
          }
        });
    }, 500);
  }).catch((error) => {
    console.error("an error occured", error.message);
  });
}

async function runCountdown() {
  try {
    await delay(1000);
    let timer = 3;

    return new Promise((resolve) => {
      const counterInterval = setInterval(counter, 1000);

      function counter() {
        document.getElementById("big-numbers").innerHTML = --timer;

        if (timer <= 1) {
          clearInterval(counterInterval);
          resolve();
          return;
        }
      }
    });
  } catch (error) {
    console.log(error);
  }
}

function handleSelectPodRacer(target) {
  const selected = document.querySelector("#racers .selected");
  if (selected) {
    selected.classList.remove("selected");
  }

  target.classList.add("selected");

  store.player_id = parseInt(target.id);
}

function handleSelectTrack(target) {
  const selected = document.querySelector("#tracks .selected");
  if (selected) {
    selected.classList.remove("selected");
  }

  target.classList.add("selected");

  store.track_id = parseInt(target.id);
}

function handleAccelerate() {
  accelerate(store.track_id - 1);
}

function renderRacerCars(racers) {
  if (!racers.length) {
    return `
			<h4>Loading Racers...</4>
		`;
  }

  const results = racers.map(renderRacerCard).join("");

  return `
		<ul id="racers">
			${results}
		</ul>
	`;
}

function renderRacerCard(racer) {
  const { id, driver_name, top_speed, acceleration, handling } = racer;

  return `
		<li class="card podracer" id="${id}">
			<h3>${driver_name}</h3>
			<p>${top_speed}</p>
			<p>${acceleration}</p>
			<p>${handling}</p>
		</li>
	`;
}

function renderTrackCards(tracks) {
  if (!tracks.length) {
    return `
			<h4>Loading Tracks...</4>
		`;
  }

  const results = tracks.map(renderTrackCard).join("");

  return `
		<ul id="tracks">
			${results}
		</ul>
	`;
}

function renderTrackCard(track) {
  const { id, name } = track;

  return `
		<li id="${id}" class="card track">
			<h3>${name}</h3>
		</li>
	`;
}

function renderCountdown(count) {
  return `
		<h2>Race Starts In...</h2>
		<p id="big-numbers">${count}</p>
	`;
}

function renderRaceStartView(track, racers) {
  return `
		<header>
			<h1>Race: ${track.name}</h1>
		</header>
		<main id="two-columns">
			<section id="leaderBoard">
				${renderCountdown(3)}
			</section>

			<section id="accelerate">
				<h2>Directions</h2>
				<p>Click the button as fast as you can to make your racer go faster!</p>
				<button id="gas-peddle">Click Me To Win!</button>
			</section>
		</main>
		<footer></footer>
	`;
}

function renderResultsView(positions) {
  positions.sort((a, b) => (a.final_position > b.final_position ? 1 : -1));

  return `
		<header>
			<h1>The Race Results</h1>
		</header>
		<main>
			${renderRaceProgress(positions)}
			<a href="/race">Start a new race</a>
		</main>
	`;
}

function renderRaceProgress(positions) {
  let userPlayer = positions.find((e) => e.id === store.player_id);
  userPlayer.driver_name += " (you)";

  positions = positions.sort((a, b) => (a.segment > b.segment ? -1 : 1));
  let count = 1;

  const results = positions
    .map((p) => {
      return `
        <tr>
          <td>
            <h3>${count++} - ${p.driver_name}</h3>
          </td>
        </tr>
		`;
    })
    .join("");

  return `
		<main>
			<h3>The Leaderboard</h3>
			<section id="leaderBoard">
				${results}
			</section>
		</main>
	`;
}

function renderAt(element, html) {
  const node = document.querySelector(element);

  node.innerHTML = html;
}

const SERVER = "http://localhost:8000";

function defaultFetchOpts() {
  return {
    mode: "cors",
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": SERVER,
    },
  };
}

function logRequestError(error) {
  console.error("Could not connect to endpoint:", error);
}

function getTracks() {
  return fetch(`${SERVER}/api/tracks`)
    .then((response) => response.json())
    .catch(logRequestError);
}

function getRacers() {
  return fetch(`${SERVER}/api/cars`)
    .then((response) => response.json())
    .catch(logRequestError);
}

function createRace(player_id, track_id) {
  player_id = parseInt(player_id);
  track_id = parseInt(track_id);
  const body = { player_id, track_id };

  return fetch(`${SERVER}/api/races`, {
    method: "POST",
    ...defaultFetchOpts(),
    dataType: "jsonp",
    body: JSON.stringify(body),
  })
    .then((res) => res.json())
    .catch((err) => console.log("Problem with createRace request::", err));
}

function getRace(id) {
  return fetch(`${SERVER}/api/races/${id}`)
    .then((response) => response.json())
    .catch(logRequestError);
}

function startRace(id) {
  return fetch(`${SERVER}/api/races/${id}/start`, {
    ...defaultFetchOpts(),
    method: "POST",
    mode: "cors",
  });
}

function accelerate(id) {
  return fetch(`${SERVER}/api/races/${id}/accelerate`, {
    method: "POST",
    ...defaultFetchOpts(),
  })
    .then((res) => resolve(res))
    .catch((err) => logRequestError);
}
