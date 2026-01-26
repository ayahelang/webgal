// Daftar website
const websites = [
  "https://silverhawk.web.id/skripkeren",
  "https://silverhawk.web.id/utel",
  "https://silverhawk.web.id/mnj",
  "https://silverhawk.web.id/sepeda",
  "https://silverhawk.web.id/cellphone",
  "https://silverhawk.web.id/websiswa",
  "https://silverhawk.web.id/travel",
  "https://silverhawk.web.id/educate",
  "https://silverhawk.web.id/wave",
  "https://silverhawk.web.id/raptor",
  "https://silverhawk.web.id/stride",
  "https://silverhawk.web.id/ayahelang"
];

// API Screenshot
const apiKey = "44ccf5";
const dimension = "1024x768";

// Elemen utama
const slidesContainer = document.getElementById("slides");
const dotsContainer = document.getElementById("dots");
const sliderElement = document.getElementById("slider");
const playPauseBtn = document.getElementById("playPauseBtn");

// Overlay hover
const hoverOverlay = document.getElementById("hoverOverlay");
const hoverImg = document.getElementById("hoverImg");
const hoverLink = document.getElementById("hoverLink");

function hideHoverOverlay() {
  hoverOverlay.style.display = "none";
  hoverImg.src = "";
  hoverLink.href = "#";
}

// Buat slide & dot
websites.forEach((url, index) => {
  const imgSrc = `https://api.screenshotmachine.com?key=${apiKey}&url=${encodeURIComponent(url)}&dimension=${dimension}`;

  const slide = document.createElement("div");
  slide.className = "slide";
  slide.innerHTML = `
    <a href="${url}" target="_blank" rel="noopener noreferrer">
      <img src="${imgSrc}" alt="Screenshot of ${url}" loading="lazy">
    </a>
  `;
  slidesContainer.appendChild(slide);

  // Hover event → tampilkan overlay
  const imgEl = slide.querySelector("img");
  imgEl.addEventListener("mouseenter", () => {
    hoverImg.src = imgSrc;
    hoverLink.href = url;
    hoverOverlay.style.display = "block";
  });
});

// Tutup overlay jika mouse keluar dari area overlay (karena ukurannya = gambar)
hoverOverlay.addEventListener("mouseleave", hideHoverOverlay);

// Dot navigation
websites.forEach((url, index) => {
  const dot = document.createElement("span");
  dot.className = "dot";
  if (index === 0) dot.classList.add("active");
  dot.addEventListener("click", () => {
    currentIndex = index;
    updateSlide();
    resetAutoSlide();
  });
  dotsContainer.appendChild(dot);
});

const slides = document.querySelector(".slides");
const slide = document.querySelectorAll(".slide");
const dots = document.querySelectorAll(".dot");
const prevBtn = document.querySelector(".prev");
const nextBtn = document.querySelector(".next");

let currentIndex = 0;
const totalSlides = slide.length;
const slidesToShow = 3;
let autoSlide;
let isPlaying = true;

// Update posisi slider & dot
function updateSlide() {
  slides.style.transform = `translateX(-${(100 / slidesToShow) * currentIndex}%)`;
  dots.forEach((d, i) => d.classList.toggle("active", i === currentIndex));
}

// Next
nextBtn.addEventListener("click", () => {
  currentIndex = (currentIndex + 1) % (totalSlides - slidesToShow + 1);
  updateSlide();
  resetAutoSlide();
});

// Prev
prevBtn.addEventListener("click", () => {
  currentIndex = (currentIndex - 1 + (totalSlides - slidesToShow + 1)) % (totalSlides - slidesToShow + 1);
  updateSlide();
  resetAutoSlide();
});

// Auto slide
function startAutoSlide() {
  autoSlide = setInterval(() => {
    currentIndex = (currentIndex + 1) % (totalSlides - slidesToShow + 1);
    updateSlide();
  }, 4000);
}
function stopAutoSlide() {
  clearInterval(autoSlide);
}
function resetAutoSlide() {
  if (isPlaying) {
    stopAutoSlide();
    startAutoSlide();
  }
}

// Tombol Play/Pause
playPauseBtn.addEventListener("click", () => {
  if (isPlaying) {
    stopAutoSlide();
    playPauseBtn.textContent = "▶ Play";
  } else {
    startAutoSlide();
    playPauseBtn.textContent = "⏸ Pause";
  }
  isPlaying = !isPlaying;
});

// Pause on hover slider
sliderElement.addEventListener("mouseenter", () => { if (isPlaying) stopAutoSlide(); });
sliderElement.addEventListener("mouseleave", () => { if (isPlaying) startAutoSlide(); });

// Area yang harus mematikan overlay
const hideOverlayAreas = document.querySelectorAll(
  "header, footer, .nav, .dots, .controls"
);

hideOverlayAreas.forEach(el => {
  el.addEventListener("mouseenter", hideHoverOverlay);
});

// Start autoplay
startAutoSlide();