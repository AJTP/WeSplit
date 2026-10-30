import { GoogleLogin } from "@react-oauth/google";

interface GoogleSignInProps {
  onIdToken: (idToken: string) => void;
  onError: (message: string) => void;
}

// Botón oficial de Google (Google Identity Services). Entrega el id_token que
// la API verifica en POST /auth/google o POST /users/me/identities.
export function GoogleSignIn({ onIdToken, onError }: GoogleSignInProps) {
  return (
    <GoogleLogin
      text="continue_with"
      onSuccess={(response) => {
        if (response.credential) onIdToken(response.credential);
        else onError("Google no devolvió credenciales. Vuelve a intentarlo.");
      }}
      onError={() => onError("No se pudo conectar con Google. Vuelve a intentarlo.")}
    />
  );
}
