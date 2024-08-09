//change language
document.addEventListener("DOMContentLoaded", function () {
  const languageMappings = {
    en: "EN",
    es: "ES",
    fr: "FR",
  };

  // Function to get a cookie value by name
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
  }

  // Function to set a cookie value
  function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    const expires = `expires=${date.toUTCString()}`;
    document.cookie = `${name}=${value}; ${expires}; path=/`;
  }

  // Function to get the language from cookies or default to 'en'
  function getCurrentLanguage() {
    return getCookie("language") || "en";
  }

  // Update the dropdown toggle text and language options
  function updateLanguageUI(language) {
    const selectedLanguage = document.getElementById("selectedLanguage");
    selectedLanguage.textContent = languageMappings[language] || "EN";

    const dropdownItems = document.querySelectorAll(".dropdown-item");
    dropdownItems.forEach((item) => {
      if (item.getAttribute("href").includes(`lang=${language}`)) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
  }

  // Get the current language from cookies or URL query parameters
  const queryLang = new URLSearchParams(window.location.search).get("lang");
  const currentLanguage = queryLang || getCurrentLanguage();
  updateLanguageUI(currentLanguage);

  // Handle language selection
  document.querySelectorAll(".dropdown-item").forEach((item) => {
    item.addEventListener("click", function (event) {
      event.preventDefault();
      const selectedLang = new URL(this.href).searchParams.get("lang");

      // Set the selected language in cookies
      setCookie("language", selectedLang, 30);

      // Reload the page with the selected language
      window.location.search = `?lang=${selectedLang}`;
    });
  });
});
