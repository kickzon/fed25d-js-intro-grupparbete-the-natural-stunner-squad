import "./room4.css";
import { stopTotalTimer, showResults, addScore, getTotalTime, showSection } from "../main";
import { getLoggedInUser } from "../login";

const passwordInput = document.getElementById("password-input") as HTMLInputElement;
const submitButton = document.getElementById("room4-submit") as HTMLButtonElement;
const showRequirementsBtn = document.querySelector(
  ".room4 .show-requirements-btn"
) as HTMLButtonElement;
const requirementsList = document.getElementById("requirements-list") as HTMLUListElement;
const messageElement = document.getElementById("room4-message") as HTMLParagraphElement;
const timerElement = document.getElementById("room4-timer") as HTMLDivElement;
const errorSound = new Audio(import.meta.env.BASE_URL + "sounds/error.mp3");
const resultSound = new Audio(import.meta.env.BASE_URL + "sounds/resultsound.mp3");

// Skickar event till main.ts att room4 är klart. för localstorage och att visa resultsidan /maria
function notifyRoom4Completed(): void {
  document.dispatchEvent(new Event("room4:completed"));
}

// Dagens datum
const todaysDate = new Date().getDate();

// Lösenordskrav
const requirements = [
  { id: 1, text: "Must be exactly 12 characters", check: (pw: string) => pw.length === 12 },
  { id: 2, text: "Must start with a capital letter", check: (pw: string) => /^[A-Z]/.test(pw) },
  { id: 3, text: "Must contain at least one number", check: (pw: string) => /[0-9]/.test(pw) },
  {
    id: 4,
    text: "Must contain current day value",
    check: (pw: string) => pw.includes(String(todaysDate)),
  },
  {
    id: 5,
    text: "Must contain at least one special character (!@#$...)",
    check: (pw: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pw),
  },
  {
    id: 6,
    text: "You must ask nicely",
    check: (pw: string) => pw.toLowerCase().includes("please"),
  },
];

//Timer
let startTime = 0;
let timerInterval: number | null = null;

function startRoom4Timer() {
  const TOTAL_SECONDS = 600;
  startTime = Date.now();

  timerInterval = setInterval(() => {
    const elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    const remainingTime = TOTAL_SECONDS - elapsedTime;

    if (remainingTime <= 0) {
      timerElement.textContent = "Time: 0:00";
      stopRoom4Timer();
      messageElement.textContent = "⏰ TIME'S UP! Starting over...";
      messageElement.style.color = "red";
      setTimeout(() => {
        document.getElementById("ten-sec-note")?.remove();
        timerElement.classList.remove("urgent");
        showSection("room1");
      }, 2000);
      return;
    }

    if (remainingTime === 10) {
      timerElement.classList.add("urgent");
      const note = document.createElement("span");
      note.id = "ten-sec-note";
      note.textContent = "Tick tock tick tock... ";
      timerElement.insertAdjacentElement("afterend", note);
    }

    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    timerElement.textContent = `Time: ${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, 1000);
} // ← stänger startRoom4Timer

function stopRoom4Timer() {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  document.getElementById("ten-sec-note")?.remove();
  timerElement.classList.remove("urgent");
}

// Funktion för att displaya kraven
function displayRequirements() {
  requirementsList.innerHTML = "";
  requirementsList.style.display = "block"; // Visa listan

  requirements.forEach((req) => {
    const li = document.createElement("li");
    li.textContent = req.text;
    li.id = `req-${req.id}`;
    requirementsList.appendChild(li);
  });

  // göm kraven efter 10 sec
  setTimeout(() => {
    requirementsList.style.display = "none";
  }, 10000);
}

showRequirementsBtn.addEventListener("click", () => {
  displayRequirements();
  startRoom4Timer();

  //Visa input-rutan och Submit-knappen efter att man klickat på show requrements-knappen
  passwordInput.style.display = "block";
  submitButton.style.display = "block";

  /*******************************************
   *******Dölj show requirements-knappen*******
   ********************************************/

  showRequirementsBtn.style.display = "none";
});

passwordInput.addEventListener("input", () => {
  const value = passwordInput.value;
});

let failCount = 0;
let noobShown = false;
let omgShown = false;

submitButton.addEventListener("click", () => {
  const password = passwordInput.value;
  const allPassed = requirements.every((req) => req.check(password));

  if (allPassed) {
    stopRoom4Timer();
    stopTotalTimer();
    messageElement.textContent = "✅ SUCCESS! Password accepted!";
    messageElement.style.color = "green";

    setTimeout(() => {
      const user = getLoggedInUser();
      const username = user ? user.username : "Anonymous";
      addScore(username, getTotalTime());
      notifyRoom4Completed(); //tillagger att main.ts får veta att rummet är klart så den kan visa resultsidan /maria
      showResults();
      resultSound.play();
    }, 1000);
  } else {
    failCount++;
    errorSound.play();

    if (failCount === 3 && !noobShown) {
      messageElement.textContent = "❌ ERROR: Password does not meet all requirements... noob 💀";
      noobShown = true;
    } else if (failCount === 6 && !omgShown) {
      messageElement.textContent = "❌ Seriously, how hard can it be? You're wasting my time 😤";
      omgShown = true;
    } else if (failCount === 9) {
      messageElement.textContent = "❌ ERROR: So close... have you tried asking nicely? 🙏";
    } else {
      messageElement.textContent = "❌ ERROR: Password does not meet all requirements";
    }
    messageElement.style.color = "red";

    passwordInput.value = "";

    setTimeout(() => {
      messageElement.textContent = "";
      displayRequirements();
    }, 2000);
  }
});
