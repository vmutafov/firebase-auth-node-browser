import { AdditionalUserInfo, Auth, AuthCredential, AuthProvider, OperationType, User, UserCredential } from "firebase/auth";
import { createServer } from "node:http";
import open from 'open';

import { FirebaseOptions } from "firebase/app";
import EventEmitter from "node:events";
import { UserImpl } from '@firebase/auth/internal';
import {
    createHttpTerminator,
} from 'http-terminator';

export type AuthResult = {
    user: User;
    credential: AuthCredential;
    operationType: typeof OperationType[keyof typeof OperationType];
    additionalUserInfo: AdditionalUserInfo | null;
}

export type SignInWithBrowserOpts = {
    port?: string | number;
    privacyPolicyUrl?: string;
    termsOfServiceUrl?: string;
    onAuthResult?: (authResult: AuthResult) => void | boolean | Promise<void> | Promise<boolean>;
}

/**
 * See https://github.com/firebase/firebaseui-web#configure-oauth-providers
 */
export type FirebaseUIAuthProvider = any;

export async function signInWithBrowser(auth: Auth, provider: AuthProvider | FirebaseUIAuthProvider, opts?: SignInWithBrowserOpts): Promise<UserCredential>
export async function signInWithBrowser(auth: Auth, providers: Array<AuthProvider | FirebaseUIAuthProvider>, opts?: SignInWithBrowserOpts): Promise<UserCredential>
export async function signInWithBrowser(auth: Auth, providers: AuthProvider | FirebaseUIAuthProvider | Array<AuthProvider | FirebaseUIAuthProvider>, opts?: SignInWithBrowserOpts): Promise<UserCredential> {
    const authPage = createAuthPage(
        Array.isArray(providers) ? providers : [providers],
        auth.app.options,
        opts
    );
    const port = opts?.port || 1996;
    const authReadyEventEmitter = new EventEmitter();

    const server = createServer(async (req, res) => {
        if (req.url === '/auth') {
            res.setHeader("Connection", "close");
            res.end(authPage);
        } else if (req.url === '/auth-callback') {
            const chunks: any[] = [];
            for await (const chunk of req) {
                chunks.push(chunk);
            }
            const body = Buffer.concat(chunks).toString();
            const authResult = JSON.parse(body);

            authReadyEventEmitter.emit("auth_ready", authResult);
            res.setHeader("Connection", "close");
            res.end();
        }
    }).listen(port);
    const httpTerminator = createHttpTerminator({ server });

    await open(`http://localhost:${port}/auth`);

    const authResult = await new Promise<AuthResult>((resolve, reject) => {
        authReadyEventEmitter.once('auth_ready', (authResult) => {
            resolve(authResult);
        });
    });
    await httpTerminator.terminate();

    const userCredentials: UserCredential = {
        operationType: authResult.operationType,
        providerId: authResult.credential?.providerId,
        user: authResult.user
    }

    if (!opts?.onAuthResult || await opts.onAuthResult(authResult) !== false) {
        const usr = UserImpl._fromJSON(auth as any, authResult.user as any);
        await auth.updateCurrentUser(usr);
    }

    return userCredentials;
}

function createAuthPage(
    providers: Array<AuthProvider | FirebaseUIAuthProvider>,
    firebaseOptions: FirebaseOptions,
    opts?: SignInWithBrowserOpts,
): string {
    const providerIds = providers
        .map(p => isAuthProvider(p) ? `"${p.providerId}"` : JSON.stringify(p))
        .join(', ');
    const encodedFirebaseOpts = Buffer.from(JSON.stringify(firebaseOptions), 'ascii').toString('base64');
    return htmlTemplate
        .replace('{{ IMMEDIATE_REDIRECT }}', `${providers.length === 1}`)
        .replace('{{ FIREBASE_OPTIONS_BASE64_JSON }}', encodedFirebaseOpts)
        .replace('{{ TERMS_OF_SERVICE_URL }}', opts?.termsOfServiceUrl || '')
        .replace('{{ PRIVACY_POLICY_URL }}', opts?.privacyPolicyUrl || '')
        .replace('{{ PROVIDER_IDS }}', providerIds);
}

function isAuthProvider(authProvider: FirebaseUIAuthProvider | AuthProvider): authProvider is AuthProvider {
    return authProvider.provider === undefined;
}

const htmlTemplate = `
<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8">
    <title>Authentication</title>
    <script src="https://www.gstatic.com/firebasejs/9.13.0/firebase-app-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/9.13.0/firebase-auth-compat.js"></script>
    <script src="https://www.gstatic.com/firebasejs/ui/6.0.2/firebase-ui-auth.js"></script>
    <link type="text/css" rel="stylesheet" href="https://www.gstatic.com/firebasejs/ui/6.0.2/firebase-ui-auth.css" />
    <script type="text/javascript">
        const firebaseConfig = JSON.parse(atob('{{ FIREBASE_OPTIONS_BASE64_JSON }}'));

        firebase.initializeApp(firebaseConfig);

        var uiConfig = {
            immediateFederatedRedirect: {{ IMMEDIATE_REDIRECT }},
            signInOptions: [
                {{ PROVIDER_IDS }}
            ],
            tosUrl: '{{ TERMS_OF_SERVICE_URL }}',
            privacyPolicyUrl: '{{ PRIVACY_POLICY_URL }}',
            callbacks: {
                signInSuccessWithAuthResult: (authResult, redirectUrl) => {
                    fetch('/auth-callback', {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(authResult),
                    }).then(() => {
                        console.info('Success');
                        document.getElementById('success-message').style.display = 'block';
                    }).catch(console.error);
                    return false;
                },
            }
        };

        var ui = new firebaseui.auth.AuthUI(firebase.auth());
        ui.start('#firebaseui-auth-container', uiConfig);
    </script>
</head>

<body>
    <h1 style="display: none;" id="success-message">Success! You may close this window now.</h1>
    <div id="firebaseui-auth-container"></div>
</body>

</html>
`;