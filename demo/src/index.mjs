import { initializeApp } from "firebase/app";
import { signInWithBrowser } from "@vmutafov/firebase-auth-node-browser";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

initializeApp({
    // ...
});

const auth = getAuth();
const userCredential = await signInWithBrowser(auth, new GoogleAuthProvider());
console.log(`user email: ${userCredential.user.email}`);