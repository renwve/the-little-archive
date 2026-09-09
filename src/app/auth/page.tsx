"use client";

import { useState } from "react";
import { createClient } from "../../../lib/supabase/client";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [username, setUsername] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  // ============================================================
  // GO TO CREATE ACCOUNT
  // ============================================================

  function handleCreateAccountClick() {
    setError("");
    setMessage("");
    setPassword("");

    // THIS changes the page from LOGIN -> CREATE ACCOUNT
    setMode("register");
  }

  // ============================================================
  // GO BACK TO LOGIN
  // ============================================================

  function handleLoginClick() {
    setError("");
    setMessage("");
    setPassword("");

    // THIS changes the page from CREATE ACCOUNT -> LOGIN
    setMode("login");
  }

  // ============================================================
  // LOGIN / CREATE ACCOUNT
  // ============================================================

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setMessage("");
    setLoading(true);

    const supabase = createClient();

    try {
      // ========================================================
      // LOGIN
      // ========================================================

      if (mode === "login") {
        const cleanEmail = email.trim().toLowerCase();

        if (!cleanEmail) {
          throw new Error("Please enter your email.");
        }

        if (!password) {
          throw new Error("Please enter your password.");
        }

        const { error: loginError } =
          await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

        if (loginError) {
          throw loginError;
        }

        router.push("/dashboard");
        router.refresh();

        return;
      }

      // ========================================================
      // CREATE ACCOUNT
      // ========================================================

      const cleanNickname = nickname.trim();
      const cleanUsername = username.trim().toLowerCase();
      const cleanEmail = email.trim().toLowerCase();

      if (!cleanNickname) {
        throw new Error("Please enter a nickname.");
      }

      if (!cleanUsername) {
        throw new Error("Please enter a username.");
      }

      if (!/^[a-zA-Z0-9_]{3,24}$/.test(cleanUsername)) {
        throw new Error(
          "Username must be 3–24 characters and use only letters, numbers, or underscores."
        );
      }

      if (!cleanEmail) {
        throw new Error("Please enter your email.");
      }

      if (!password) {
        throw new Error("Please enter a password.");
      }

      if (password.length < 6) {
        throw new Error(
          "Your password must be at least 6 characters."
        );
      }

      // ========================================================
      // CHECK USERNAME
      // ========================================================

      const { data: existingProfile, error: usernameError } =
        await supabase
          .from("profiles")
          .select("id")
          .eq("username", cleanUsername)
          .maybeSingle();

      if (usernameError) {
        console.error(usernameError);

        throw new Error(
          "We couldn't check the username. Please try again."
        );
      }

      if (existingProfile) {
        throw new Error(
          "That username is already taken. Please choose another one."
        );
      }

      // ========================================================
      // CREATE SUPABASE AUTH USER
      // ========================================================

      const { data, error: signupError } =
        await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              nickname: cleanNickname,
              username: cleanUsername,
            },
          },
        });

      if (signupError) {
        throw signupError;
      }

      if (!data.user) {
        throw new Error(
          "The account could not be created. Please try again."
        );
      }

      // ========================================================
      // LOGGED IN IMMEDIATELY
      // ========================================================

      if (data.session) {
        router.push("/dashboard");
        router.refresh();

        return;
      }

      // ========================================================
      // EMAIL CONFIRMATION
      // ========================================================

      setMessage(
        "Account created successfully! Check your email to confirm your account, then log in."
      );

      setPassword("");
    } catch (err: unknown) {
      console.error("Authentication error:", err);

      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <main className="auth-page">
      <section className="auth-card">

        {/* ======================================================
            BRAND
        ====================================================== */}

        <div className="brand">
          the little archive
        </div>

        <p className="muted">
          A personal place to keep track of everything you watch.
        </p>

        {/* ======================================================
            LOGIN
        ====================================================== */}

        {mode === "login" && (
          <>
            <div className="auth-container">
              <h1>Welcome back</h1>

              <p className="muted">
                Log in to continue to your archive.
              </p>

              <form onSubmit={submit}>

                {/* EMAIL */}

                <div className="field">
                  <label htmlFor="login-email">
                    Email
                  </label>

                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    disabled={loading}
                  />
                </div>

                {/* PASSWORD */}

                <div className="field">
                  <label htmlFor="login-password">
                    Password
                  </label>

                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    placeholder="Your password"
                    autoComplete="current-password"
                    required
                    disabled={loading}
                  />
                </div>

                {/* ERROR */}

                {error && (
                  <div className="error" role="alert">
                    {error}
                  </div>
                )}

                {/* LOGIN */}

                <button
                  type="submit"
                  className="btn"
                  disabled={loading}
                  style={{
                    width: "100%",
                  }}
                >
                  {loading
                    ? "Logging in..."
                    : "Log in"}
                </button>

              </form>
            </div>

            {/* ==================================================
                CREATE ACCOUNT SWITCH
            ================================================== */}

            <div className="auth-switch">

              <span>
                New here?{" "}
              </span>

              <button
                type="button"
                className="link"
                onClick={handleCreateAccountClick}
              >
                Create an account
              </button>

            </div>
          </>
        )}

        {/* ======================================================
            CREATE ACCOUNT
        ====================================================== */}

        {mode === "register" && (
          <>
            <div className="auth-container">

              <h1>
                Create your account
              </h1>

              <p className="muted">
                Start your own little archive.
              </p>

              <form onSubmit={submit}>

                {/* NICKNAME */}

                <div className="field">
                  <label htmlFor="register-nickname">
                    Nickname
                  </label>

                  <input
                    id="register-nickname"
                    type="text"
                    value={nickname}
                    onChange={(e) =>
                      setNickname(e.target.value)
                    }
                    placeholder="What should people call you?"
                    autoComplete="nickname"
                    required
                    disabled={loading}
                  />
                </div>

                {/* USERNAME */}

                <div className="field">
                  <label htmlFor="register-username">
                    Username
                  </label>

                  <input
                    id="register-username"
                    type="text"
                    value={username}
                    onChange={(e) =>
                      setUsername(
                        e.target.value.toLowerCase()
                      )
                    }
                    placeholder="unique_username"
                    autoComplete="username"
                    maxLength={24}
                    required
                    disabled={loading}
                  />

                  <small className="muted">
                    3–24 characters. Letters, numbers,
                    and underscores only.
                  </small>
                </div>

                {/* EMAIL */}

                <div className="field">
                  <label htmlFor="register-email">
                    Email
                  </label>

                  <input
                    id="register-email"
                    type="email"
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                    disabled={loading}
                  />
                </div>

                {/* PASSWORD */}

                <div className="field">
                  <label htmlFor="register-password">
                    Password
                  </label>

                  <input
                    id="register-password"
                    type="password"
                    value={password}
                    onChange={(e) =>
                      setPassword(e.target.value)
                    }
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                    minLength={6}
                    required
                    disabled={loading}
                  />
                </div>

                {/* ERROR */}

                {error && (
                  <div className="error" role="alert">
                    {error}
                  </div>
                )}

                {/* SUCCESS */}

                {message && (
                  <div className="success" role="status">
                    {message}
                  </div>
                )}

                {/* CREATE ACCOUNT */}

                <button
                  type="submit"
                  className="btn"
                  disabled={loading}
                  style={{
                    width: "100%",
                  }}
                >
                  {loading
                    ? "Creating account..."
                    : "Create account"}
                </button>

              </form>
            </div>

            {/* ==================================================
                BACK TO LOGIN
            ================================================== */}

            <div className="auth-switch">

              <span>
                Already have an account?{" "}
              </span>

              <button
                type="button"
                className="link"
                onClick={handleLoginClick}
              >
                Log in
              </button>

            </div>
          </>
        )}

      </section>
    </main>
  );
}