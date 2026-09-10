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

  function handleCreateAccountClick() {
    setError("");
    setMessage("");
    setPassword("");
    setMode("register");
  }

  function handleLoginClick() {
    setError("");
    setMessage("");
    setPassword("");
    setMode("login");
  }

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

  return (
    <main className="auth-page">
      <section className="auth-wrapper">

        {/* ====================================================
            BRAND AREA
        ==================================================== */}

        <aside className="auth-intro">
          <h1 className="intro-title">
            the little
            <br />
            <span>archive.</span>
          </h1>

          <p className="intro-description">
            A personal space for everything you watch,
            remember, and want to keep.
          </p>
        </aside>

        {/* ====================================================
            AUTH CARD
        ==================================================== */}

        <section className="auth-card">

          <div className="auth-card-top">
            <span />
            <span />
            <span />
          </div>

          {/* ==================================================
              LOGIN
          ================================================== */}

          {mode === "login" && (
            <div className="auth-container">

              <div className="auth-heading">
                <p className="eyebrow">
                  WELCOME BACK
                </p>

                <h2>
                  Pick up
                  <br />
                  where you left off.
                </h2>
              </div>

              <form onSubmit={submit}>

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

                {error && (
                  <div className="error" role="alert">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="auth-submit"
                  disabled={loading}
                >
                  <span>
                    {loading ? "Logging in..." : "Log in"}
                  </span>

                  <span className="button-arrow">
                    →
                  </span>
                </button>
              </form>

              <div className="auth-switch">
                <span>New here?</span>

                <button
                  type="button"
                  className="link"
                  onClick={handleCreateAccountClick}
                  disabled={loading}
                >
                  Create an account
                </button>
              </div>
            </div>
          )}

          {/* ==================================================
              REGISTER
          ================================================== */}

          {mode === "register" && (
            <div className="auth-container">

              <div className="auth-heading">
                <p className="eyebrow">
                  NEW ACCOUNT
                </p>

                <h2>
                  Make a little
                  <br />
                  space for yourself.
                </h2>
              </div>

              <form onSubmit={submit}>

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
                    placeholder="What should we call you?"
                    autoComplete="nickname"
                    required
                    disabled={loading}
                  />
                </div>

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
                    placeholder="your_username"
                    autoComplete="username"
                    maxLength={24}
                    required
                    disabled={loading}
                  />

                  <small className="field-hint">
                    3–24 characters · letters, numbers,
                    and underscores
                  </small>
                </div>

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

                {error && (
                  <div className="error" role="alert">
                    {error}
                  </div>
                )}

                {message && (
                  <div className="success" role="status">
                    {message}
                  </div>
                )}

                <button
                  type="submit"
                  className="auth-submit"
                  disabled={loading}
                >
                  <span>
                    {loading
                      ? "Creating account..."
                      : "Create account"}
                  </span>

                  <span className="button-arrow">
                    →
                  </span>
                </button>
              </form>

              <div className="auth-switch">
                <span>Already have an account?</span>

                <button
                  type="button"
                  className="link"
                  onClick={handleLoginClick}
                  disabled={loading}
                >
                  Log in
                </button>
              </div>
            </div>
          )}

          <div className="auth-card-footer">
            <span>THE LITTLE ARCHIVE</span>
            <span>EST. 2026</span>
          </div>

        </section>
      </section>
    </main>
  );
}