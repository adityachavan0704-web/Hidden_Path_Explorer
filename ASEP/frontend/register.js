// register.js - Handles user registration with Firebase
// This module manages the registration form submission and Firebase authentication

// Import Firebase functions and shared config
import { auth } from "./firebase-config.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

// DOM elements
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const submitButton = document.getElementById("submit");

// Event listener for form submission
submitButton.addEventListener("click", async function (event) {
  event.preventDefault(); // Prevent default form submission

  // Get input values
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  // Basic validation
  if (!email || !password) {
    alert("Please fill in all fields.");
    return;
  }

  if (password.length < 6) {
    alert("Password should be at least 6 characters long.");
    return;
  }

  try {
    // Attempt to create user account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Success: Show message and redirect
    alert("Account created successfully! Welcome to HiddenPath.");
    window.location.href = "login.html"; // Redirect to login page
  } catch (error) {
    // Handle errors
    const errorCode = error.code;
    const errorMessage = error.message;

    // Provide user-friendly error messages
    switch (errorCode) {
      case "auth/email-already-in-use":
        alert("This email is already registered. Please try logging in instead.");
        break;
      case "auth/invalid-email":
        alert("Please enter a valid email address.");
        break;
      case "auth/weak-password":
        alert("Password is too weak. Please choose a stronger password.");
        break;
      case "auth/network-request-failed":
        alert("Network error. Please check your internet connection and try again.");
        break;
      default:
        alert(`Registration failed: ${errorMessage}`);
    }
  }
});
