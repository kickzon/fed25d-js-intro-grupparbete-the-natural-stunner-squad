import "./style.css";
import "./login";
import { initRoom1 } from "./rooms/room1";
import { renderCaptchaRoom } from "./rooms/room2";
import "./rooms/room3";
import "./rooms/room4";
import { setupRoomIntro } from "./rooms/roomIntro";
import { updateUserDisplay, isLoggedIn } from "./login";

const startButton = document.getElementById("start-btn") as HTMLButtonElement;

let gameStarted = false;

/********************************************/
/*****************BG MUSIC*******************/
/********************************************/

const bgMusic = new Audio(import.meta.env.BASE_URL + "sounds/background-music-startpage.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.2;

document.addEventListener(
  "click",
  () => {
    bgMusic.play();
  },
  { once: true }
);

// Lista med alla sektioner i spelet i den ordning de finns i HTML.
const sectionOrder = [
  "start",
  "room1",
  "room2",
  "room3",
  "room3-timeout",
  "room4",
  "results",
] as const;

// Skapar en typ av alla tillåtna sektionsnamn.
// Exempel: "start" | "room1" | "room2" | "room3" | "room4".
export type SectionId = (typeof sectionOrder)[number];

startButton?.addEventListener("click", handleStartButtonClick);
function handleStartButtonClick(): void {
  if (!isLoggedIn()) {
    alert("You must be logged in to play");
    return;
  }
  if (gameStarted) {
    return;
  }
  gameStarted = true;
  // Startar en ny spelomgång i sparad progress.
  setStartedProgress();
  clearSavedTotalSeconds();
  updateProgressFromStorage();
  startTotalTimer();
  bgMusic.pause();
  bgMusic.currentTime = 0;
  showSection("room1");
}

/*********************************************************
 **************** SPELPROGRESS (LOCAL STORAGE) ************
 **********************************************************/

type RoomId = "room1" | "room2" | "room3" | "room4";

// Nyckeln i localStorage för spelprogress.
const PROGRESS_KEY = "game-progress-v1";
// Nyckeln i localStorage för totaltid (sekunder).
const TOTAL_TIMER_KEY = "error404-total-seconds";

// Sparad progress: var spelaren är och vilka rum som är klara.
type GameProgress = {
  currentRoom: SectionId;
  completedRooms: RoomId[];
};

// Standard om ingen progress är sparad ännu.
function getDefaultProgress(): GameProgress {
  return { currentRoom: "start", completedRooms: [] };
}

// Kontrollerar att värdet är en giltig sektion.
function isSectionId(value: unknown): value is SectionId {
  return (
    value === "start" ||
    value === "room1" ||
    value === "room2" ||
    value === "room3" ||
    value === "room4" ||
    value === "results"
  );
}

// Kontrollerar att värdet är ett giltigt rum-id.
function isRoomId(value: unknown): value is RoomId {
  return value === "room1" || value === "room2" || value === "room3" || value === "room4";
}

// Hämtar sparad progress från localStorage.
function getProgress(): GameProgress {
  const saved = localStorage.getItem(PROGRESS_KEY);
  if (!saved) {
    return getDefaultProgress();
  }
  //försöker göra string till objekt, och kolla att det är i rätt format.
  // Om något går fel (tex om datan är korrupt) så fångas det av catch och default progress returneras.
  try {
    const parsed = JSON.parse(saved) as Partial<GameProgress>;
    const currentRoom: SectionId = isSectionId(parsed.currentRoom) ? parsed.currentRoom : "start";

    const completedRooms: RoomId[] = Array.isArray(parsed.completedRooms)
      ? parsed.completedRooms.filter(isRoomId)
      : [];

    return { currentRoom, completedRooms };
  } catch {
    //om json.pasrse kastar error så fångas det här och default progress returneras istället för att hela appen kraschar.
    return getDefaultProgress();
  }
}

// Sparar progress i localStorage.
function saveProgress(progress: GameProgress): void {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

// Start Game ska nollställa tidigare progression.
function setStartedProgress(): void {
  saveProgress({ currentRoom: "room1", completedRooms: [] });
}

// Markerar ett rum som klart och flyttar currentRoom framåt.
function completeRoom(roomId: RoomId): void {
  const progress = getProgress();

  if (!progress.completedRooms.includes(roomId)) {
    progress.completedRooms.push(roomId);
  }

  if (roomId === "room1") {
    progress.currentRoom = "room2";
  }
  if (roomId === "room2") {
    progress.currentRoom = "room3";
  }
  if (roomId === "room3") {
    progress.currentRoom = "room4";
  }
  if (roomId === "room4") {
    progress.currentRoom = "results";
  }

  saveProgress(progress);
}

/*********************************************************
 *************** VISA SEKTIONER OCH PROGRESS **************
 **********************************************************/

// Visar den valda sektionen.
// Gömmer alla andra sektioner.
export function showSection(activeId: SectionId): void {
  sectionOrder.forEach((id) => {
    const section = document.querySelector<HTMLElement>(`#${id}`);
    if (!section) {
      return;
    }
    section.hidden = id !== activeId;
  });
}

// Referens till textbaserad loading-bar i headern.
const loadingBar = document.getElementById("loadingBar") as HTMLSpanElement;
// Uppdaterar loading-baren utifrån vilket rum spelaren är i.
function updateProgress(roomNumber: number): void {
  if (!loadingBar) {
    return;
  }

  const totalBlocks = 10;
  const filledBlocks = Math.round((roomNumber / 4) * totalBlocks);
  const bar = "ESCAPE STATUS: " + "█".repeat(filledBlocks) + "░".repeat(totalBlocks - filledBlocks);
  loadingBar.textContent = bar;
}

// Läser sparad progress och uppdaterar progressbaren.
function updateProgressFromStorage(): void {
  const progress = getProgress();
  updateProgress(progress.completedRooms.length);
}

// Återställer UI till sparat läge vid reload.
function syncUiFromSavedProgress(): void {
  const saved = getProgress();
  updateProgressFromStorage();
  // Om spelaren redan har börjat: visa sparat rum och markera spelet som startat.
  if (saved.currentRoom !== "start") {
    showSection(saved.currentRoom);
    gameStarted = true;
    startTotalTimer();
  }
}

// Körs när room3 skickar event om att rummet är klart. (för localstorage)
function handleRoom3Completed(): void {
  completeRoom("room3");
  updateProgressFromStorage();
  showSection("room4");
}

// Körs när room4 skickar event om att rummet är klart. (för localstorage)
function handleRoom4Completed(): void {
  completeRoom("room4");
  updateProgressFromStorage();
}

// Kopplar event från room-filerna till main-flödet.
function registerRoomCompletionListeners(): void {
  document.addEventListener("room3:completed", handleRoom3Completed);
  document.addEventListener("room4:completed", handleRoom4Completed);
}

// Startar room1 och kopplar vad som ska hända när room1 är klart.
function initRooms(): void {
  const room1Section = document.querySelector<HTMLElement>("#room1");
  const room2Section = document.querySelector<HTMLElement>("#room2");
  const room3StartButton = document.querySelector<HTMLButtonElement>("#start-room3-btn");
  // Om room1 eller room2 inte finns i HTML kan vi inte starta spelet.
  if (!room1Section || !room2Section) {
    return;
  }
  // Alias efter guard så TypeScript vet att elementet finns.
  const safeRoom1Section = room1Section;
  const safeRoom2Section = room2Section;
  // Ladda eventuell sparad progress.
  syncUiFromSavedProgress();
  const captchaRoom = renderCaptchaRoom(
    () => {
      completeRoom("room2");
      updateProgressFromStorage();
      showSection("room3");
    },
    () => {
      saveProgress({ currentRoom: "room1", completedRooms: [] });
      clearSavedTotalSeconds();
      location.reload();
    }
  );

  const captchaHost = safeRoom2Section.querySelector<HTMLElement>("#captcha-room");
  if (captchaHost) {
    captchaHost.replaceWith(captchaRoom);
  } else {
    safeRoom2Section.appendChild(captchaRoom);
  }

  let room1IsInitialized = false;

  function handleRoom1Completed(): void {
    completeRoom("room1");
    updateProgressFromStorage();
    showSection("room2");
  }

  // Startar room1-logiken först när intro-knappen klickas.
  function startRoom1FromIntro(): void {
    if (room1IsInitialized) {
      return;
    }
    room1IsInitialized = true;
    initRoom1(safeRoom1Section, handleRoom1Completed);
  }

  // Intro för room1: visar json-info innan spelet börjar.
  void setupRoomIntro({
    roomId: "room1",
    introId: "room1-intro",
    titleId: "room1-intro-title",
    descriptionId: "room1-intro-description",
    startButtonId: "room1-intro-start-btn",
    contentId: "room1-content",
    onStart: startRoom1FromIntro,
  });

  // Intro för room3: när intro startas "klickar" vi på befintlig startknapp.
  void setupRoomIntro({
    roomId: "room3",
    introId: "room3-intro",
    titleId: "room3-intro-title",
    descriptionId: "room3-intro-description",
    startButtonId: "room3-intro-start-btn",
    contentId: "room3-content",
    onStart: () => {
      room3StartButton?.click();
    },
  });

  // Intro för room4: visar json-info innan spelaren börjar.
  void setupRoomIntro({
    roomId: "room4",
    introId: "room4-intro",
    titleId: "room4-intro-title",
    descriptionId: "room4-intro-description",
    startButtonId: "room4-intro-start-btn",
    contentId: "room4-content",
  });
}
/********************************************/
/**************** ABOUT US*******************/
/********************************************/

const aboutBtn = document.querySelector<HTMLButtonElement>("#about-btn");
const aboutSection = document.querySelector<HTMLElement>("#about");
const aboutCloseBtn = document.querySelector<HTMLButtonElement>("#about-close-btn");

aboutBtn?.addEventListener("click", () => {
  aboutSection?.removeAttribute("hidden");
  aboutSection?.classList.add("open");
});

aboutCloseBtn?.addEventListener("click", () => {
  aboutSection?.classList.remove("open");
  aboutSection?.setAttribute("hidden", "");
});

aboutSection?.addEventListener("click", (e) => {
  if (e.target === aboutSection) {
    aboutSection.classList.remove("open");
    aboutSection.setAttribute("hidden", "");
  }
});

/*********************************************************
 ***************************TIMER**************************
 **********************************************************/

const totalTimerElement = document.getElementById("total-time") as HTMLDivElement;

let totalStartTime = 0;
let totalTimerInterval: number | null = null;

// Läser sparad totaltid i sekunder.
function getSavedTotalSeconds(): number {
  const raw = localStorage.getItem(TOTAL_TIMER_KEY);
  if (!raw) {
    return 0;
  }
  return Number(raw) || 0;
}

// Sparar totaltid i sekunder.
function saveTotalSeconds(totalSeconds: number): void {
  localStorage.setItem(TOTAL_TIMER_KEY, String(totalSeconds));
}

// Tar bort sparad totaltid.
function clearSavedTotalSeconds(): void {
  localStorage.removeItem(TOTAL_TIMER_KEY);
}
// Startar total-timern, som räknar uppåt från 0 eller från sparad tid.
function startTotalTimer() {
  totalStartTime = Date.now();
  // Stoppar eventuell gammal interval innan ny start.
  stopTotalTimer();

  // Fortsätter från sparad tid om den finns.
  const savedSeconds = getSavedTotalSeconds();
  totalStartTime = Date.now() - savedSeconds * 1000;

  // Visar sparad tid direkt när timern startar.
  const startMinutes = Math.floor(savedSeconds / 60);
  const startSeconds = savedSeconds % 60;
  totalTimerElement.textContent = `Time: ${startMinutes}:${startSeconds.toString().padStart(2, "0")}`;

  //Skapa ett intervall som körs varje sekund
  totalTimerInterval = setInterval(() => {
    //Räkna ut hur många sekunder som gått sedan start
    //Date.now() minus starttid ger millisekunder, dela med 1000 för sekunder
    //Math.floor avrundar nedåt till hela sekunder
    const elapsedTime = Math.floor((Date.now() - totalStartTime) / 1000);

    // Spara uppdaterad totaltid.
    saveTotalSeconds(elapsedTime);

    //Räkna ut antal hela minuter genom att dela sekunder med 60
    //Math.floor avrundar nedåt till hela minuter
    const minutes = Math.floor(elapsedTime / 60);

    //Räkna ut resterande sekunder efter att minuter räknats bort
    //Modulo (%) ger resten efter division
    const seconds = elapsedTime % 60;

    //Uppdatera timer-elementets text
    //toString() gör om nummer till text
    //padStart(2, '0') lägger till nolla framför ensiffriga tal
    totalTimerElement.textContent = `Time: ${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, 1000);
}
// Stoppar total-timern. Tar bort intervallet och sparar inte längre tid.
export function stopTotalTimer() {
  if (totalTimerInterval !== null) {
    clearInterval(totalTimerInterval);
    totalTimerInterval = null;
  }
}
//visar resultat-sektionen och uppdaterar total-tiden därifrån. Kallas när spelet är klart.
export function showResults() {
  showSection("results"); // ← lägg till denna
  //Hämta elementet från html
  const finalTimeDisplay = document.getElementById("final-time-display") as HTMLSpanElement;

  //Hämta texten från totalTimerElement
  const timeText = totalTimerElement.textContent || "0:00";

  //Ta bort order "time:"
  const timeOnly = timeText.replace("Time: ", "");

  if (finalTimeDisplay) {
    finalTimeDisplay.textContent = timeOnly;
  }
  displayTop3();
}

/*********************************************************
 ********************HIGHSCORE TOP 10**********************
 **********************************************************/

//Denna funktion räknar ut hur många sek som gått sen start
//Returnerar ett nummer (tex 245 för 4min o 5 sek)
export function getTotalTime(): number {
  const elapsedTime = Math.floor((Date.now() - totalStartTime) / 1000);
  return elapsedTime;
}

//Array för att lagra highscore
let highscore: { name: string; time: number }[] = [];

// LADDA highscores från localStorage när sidan startar
function loadHighscores() {
  const saved = localStorage.getItem("highscores");
  if (saved) {
    highscore = JSON.parse(saved);
    displayHighscores();
  }
}

export function addScore(name: string, time: number) {
  //Kolla om spelaren redan finns i listan
  const existingIndex = highscore.findIndex((score) => score.name === name);

  if (existingIndex !== -1) {
    //Spelaren finns redan
    if (time < highscore[existingIndex].time) {
      // ← Saknades {
      //Nytt resultat är bättre -> uppdatera tiden
      highscore[existingIndex].time = time;
    } else {
      //Nytt resultat är sämre -> gör ingenting, funktionen avslutas
      return;
    }
  } else {
    // ← Ta bort duplicerad else här
    //Ny spelare -> lägg till i arrayen
    highscore.push({ name: name, time: time });
  }

  //Sortera - snabbast = bäst
  highscore.sort((a, b) => a.time - b.time);

  //Behåll bara top 10
  highscore = highscore.slice(0, 10);

  //Spara i LS
  localStorage.setItem("highscores", JSON.stringify(highscore));

  //Visa på sidan
  displayHighscores();
}

function displayHighscores() {
  const highscoreList = document.getElementById("highscore-top10-list") as HTMLOListElement;
  //Tömmer listan ifall där redan finns innehåll
  highscoreList.innerHTML = "";
  //Loopa ala highscore
  highscore.forEach((score) => {
    //skapa <li>-element
    const li = document.createElement("li");

    //formetera tiden från sek till M:SS
    const minutes = Math.floor(score.time / 60);
    const seconds = score.time % 60;
    const timeFormatted = `${minutes}:${seconds.toString().padStart(2, "0")}`;

    //Sätt texten: "namn - tid"
    li.textContent = `${score.name} - ${timeFormatted}`;
    //läg till <li> i <ol>
    highscoreList.appendChild(li);
  });
}

/*********************************************************
 ********************HIGHSCORE TOP 3***********************
 **********************************************************/

function displayTop3() {
  const top3List = document.getElementById("top3") as HTMLOListElement;

  //Töm listan
  top3List.innerHTML = "";

  //Tar bara de 3 första från highscore arrayen
  const top3 = highscore.slice(0, 3);

  //Loopa och skapa <li>
  top3.forEach((score) => {
    const li = document.createElement("li");

    // Formatera tiden
    const minutes = Math.floor(score.time / 60);
    const seconds = score.time % 60;
    const timeFormatted = `${minutes}:${seconds.toString().padStart(2, "0")}`;

    li.textContent = `${score.name} - ${timeFormatted}`;
    top3List.appendChild(li);
  });
}

loadHighscores();

/*********************************************************
 **************************RESET***************************
 **********************************************************/

const resetBtn = document.getElementById("reset-btn") as HTMLButtonElement;

function handleResetClick(): void {
  // Rensar bara spelprogress, men behåller highscore/login.
  localStorage.removeItem(PROGRESS_KEY);
  clearSavedTotalSeconds();
  location.reload();
}

// Tidigare reset-kod:
// resetBtn?.addEventListener('click', () => {
//   location.reload();
// });

resetBtn?.addEventListener("click", handleResetClick);

/*********************************************************
 **********************SHARE RESULTS***********************
 **********************************************************/

const shareBtn = document.getElementById("share-btn") as HTMLButtonElement;
const shareFeedback = document.getElementById("share-feedback") as HTMLParagraphElement;

shareBtn?.addEventListener("click", () => {
  const timeText = totalTimerElement.textContent?.replace("Time: ", "") || "0:00";
  const shareText = `I completed Error 404 in ${timeText}! Can you beat my record? 👾 https://medieinstitutet.github.io/fed25d-js-intro-grupparbete-the-natural-stunner-squad/`;

  navigator.clipboard.writeText(shareText).then(() => {
    shareFeedback.textContent = "✅ Copied to clipboard!";
    setTimeout(() => {
      shareFeedback.textContent = "";
    }, 3000);
  });
});

function handleTitleClickWithConfirmation(): void {
  const confirmed = confirm("This will clear your progress and restart the game. Are you sure?");
  if (!confirmed) return;
  localStorage.removeItem("game-progress-v1");
  localStorage.removeItem("error404-total-seconds");
  location.reload();
}

const siteTitle = document.querySelector<HTMLElement>("h1");
siteTitle?.addEventListener("click", handleTitleClickWithConfirmation);

// Startar appen sist, efter att alla variabler/funktioner är initierade.
registerRoomCompletionListeners();
initRooms();
updateUserDisplay();
