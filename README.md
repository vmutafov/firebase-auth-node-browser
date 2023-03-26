# Firebase Auth NodeJS Browser Login

[![npm version](https://badge.fury.io/js/@vmutafov%2Ffirebase-auth-node-browser.svg)](https://badge.fury.io/js/@vmutafov%2Ffirebase-auth-node-browser)


## What?
This library provides the function `signInWithBrowser` that could be used from NodeJS applications in order to open up a browser and log in from there. 

## Why?
There are use cases where you may want to support Google, Facebook or other third-party authentication and authorization services in your NodeJS app. For example, if you are building a CLI that requires users to log in, it may be easier for users to log in with, for example - Google. Currently, as the Firebase's client SDK does not support federated authentication when running in NodeJS, this functionality is a bit hard to achieve only by using the Firebase SDK.

## How?
In order to use this library, first install it through npm:
```
npm i @vmutafov/firebase-auth-node-browser
```
After that, you only need to call the `signInWithBrowser` function:
```TypeScript
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { signInWithBrowser } from "@vmutafov/firebase-auth-node-browser";

const auth = getAuth();
const userCredential = await signInWithBrowser(auth, new GoogleAuthProvider());
```

You can either pass a single `AuthProvider` like in the example above or pass multiple ones:
```TypeScript
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, EmailAuthProvider } from "firebase/auth";
import { signInWithBrowser } from "@vmutafov/firebase-auth-node-browser";

const auth = getAuth();
const authProviders = [new GoogleAuthProvider(), new FacebookAuthProvider(), new EmailAuthProvider()]
const userCredential = await signInWithBrowser(auth, authProviders);
```

The difference with this approach is that when `signInWithBrowser` is called, the user would be able to choose between all authentication providers. 
Internally, this library uses [FirebaseUI for Web](https://github.com/firebase/firebaseui-web) and the UI is the default one from it.

## Demo?

There is an example project inside the `demo` folder. In order to start it, run `npm i` and then `npm start`. You should then be navigated to your default browser and you should see the different authentication options.