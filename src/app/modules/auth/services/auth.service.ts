import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { TokenService } from '../../../shared/services/token.service';
import {
  Auth,
  GithubAuthProvider,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  user,
  User,
} from '@angular/fire/auth';
import { Firestore, collection, doc, setDoc } from '@angular/fire/firestore';
import { from, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth = inject(Auth);
  user$: Observable<User | null>;
  private http = inject(HttpClient);
  private tokenService = inject(TokenService);
  private apiUrl = `${environment.services.api.url}/auth`;
  constructor(private firestore: Firestore) {
    this.user$ = user(this.auth);
  }

  login(email: string, password: string): Observable<void> {
    const promise = signInWithEmailAndPassword(this.auth, email, password).then(
      async (cred) => {
        await this.sendTokenToBackend();
      }
    );
    return from(promise);
  }

  async loginWithGithub() {
    const provider = new GithubAuthProvider();
    const result = await signInWithPopup(this.auth, provider);
    await this.postLogin(result.user);
  }

  async loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(this.auth, provider);
    await this.postLogin(result.user);
  }

  private async postLogin(user: User) {
    if (user) {
      await this.createUserDocument(user);
      await this.sendTokenToBackend();
    }
  }

  private async sendTokenToBackend(): Promise<void> {
    // Utiliser TokenService pour rafraîchir le token
    const currentUser = this.auth.currentUser;
    const token = currentUser ? await this.tokenService.refreshToken(currentUser) : null;

    if (!token) {
      console.error('Aucun token disponible');
      return;
    }

    try {
      // Envoyer le token au backend
      await this.http
        .post<void>(`${this.apiUrl}/verify-token`, { token })
        .toPromise();
    } catch (error) {
      console.error('Erreur lors de l\'envoi du token au backend:', error);
    }
  }

  async createUserDocument(user: User) {
    if (!user) return;

    const userRef = doc(collection(this.firestore, 'users'), user.uid);
    const userData = {
      uid: user.uid,
      email: user.email || null,
      displayName: user.displayName || 'Utilisateur',
      photoURL: user.photoURL || null,
      providerId: user.providerData[0]?.providerId || 'unknown',
      createdAt: new Date(),
    };

    try {
      await setDoc(userRef, userData, { merge: true });
      console.log('Utilisateur ajouté à Firestore avec succès');
    } catch (error) {
      console.error(
        'Erreur lors de l’ajout de l’utilisateur à Firestore :',
        error
      );
    }
  }

  logout(): Observable<void> {
    const promise = signOut(this.auth)
      .then(() => {
        // Effacer le token dans TokenService
        this.tokenService.clearToken();
        sessionStorage.clear();
        return this.http
          .post<void>(`${this.apiUrl}/logout`, {})
          .toPromise();
      })
      .catch((error) => {
        console.error('Erreur lors de la déconnexion:', error);
      });

    return from(promise);
  }

  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }
}
