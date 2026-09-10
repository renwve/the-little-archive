"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "../lib/supabase/client";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  LogOut,
  Pencil,
  Trash2,
  X,
  Heart,
  SlidersHorizontal,
  Film,
  Tv,
  Sparkles,
  UserRound,
  ChevronDown,
  ChevronUp,
  Layers,
} from "lucide-react";

type Profile = {
  id: string;
  nickname: string;
  username: string;
  pronouns: string | null;
  bio: string | null;
  avatar_url: string | null;
  background_url: string | null;
  tags: string[];
};

type Archive = {
  id: string;
  title: string;
  content_type: string;
  viewing_format: "standalone" | "episodic";
  date_watched: string | null;
  date_finished: string | null;
  rating: number | null;
  duration_minutes: number | null;
  review_notes: string | null;
  actors: string[];
  favorite: boolean;
  created_at: string;
};

type Episode = {
  id: string;
  archive_id: string;
  episode_number: number;
  title: string | null;
  rating: number | null;
  notes: string | null;
  created_at: string;
};

const types = ["movie", "series", "anime", "documentary", "other"];

export default function Dashboard() {
  const supabase = createClient();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [archives, setArchives] = useState<Archive[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);

  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState("");

  const [modal, setModal] = useState(false);
  const [profileModal, setProfileModal] = useState(false);
  const [editing, setEditing] = useState<Archive | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth");
      return;
    }

    let p = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!p.data) {
      await supabase.from("profiles").insert({
        id: user.id,
        nickname: user.user_metadata?.nickname || "New archivist",
        username:
          user.user_metadata?.username ||
          `user_${user.id.slice(0, 8)}`,
      });

      p = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
    }

    setProfile(p.data);

    const a = await supabase
      .from("archives")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const archiveData = a.data || [];

    setArchives(archiveData);

    if (archiveData.length > 0) {
      const e = await supabase
        .from("archive_episodes")
        .select("*")
        .in(
          "archive_id",
          archiveData.map((archive) => archive.id)
        )
        .order("episode_number", {
          ascending: true,
        });

      setEpisodes(e.data || []);
    } else {
      setEpisodes([]);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let x = [...archives];

    /*
     * IMPORTANT:
     * Standalone / episodic are NOT browse categories.
     * They describe the structure of an individual archive.
     */

    if (category === "favorites") {
      x = x.filter((a) => a.favorite);
    }

    if (category === "movies") {
      x = x.filter(
        (a) => a.content_type === "movie"
      );
    }

    if (category === "series") {
      x = x.filter(
        (a) => a.content_type === "series"
      );
    }

    if (category === "anime") {
      x = x.filter(
        (a) => a.content_type === "anime"
      );
    }

    if (category === "recent") {
      x = x
        .filter((a) => a.date_watched)
        .sort((a, b) =>
          (b.date_watched || "").localeCompare(
            a.date_watched || ""
          )
        );
    }

    const q = search.trim().toLowerCase();

    if (q) {
      x = x.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.actors.some((v) =>
            v.toLowerCase().includes(q)
          ) ||
          (a.review_notes || "")
            .toLowerCase()
            .includes(q)
      );
    }

    if (sort === "newest") {
      x.sort((a, b) =>
        b.created_at.localeCompare(a.created_at)
      );
    }

    if (sort === "oldest") {
      x.sort((a, b) =>
        a.created_at.localeCompare(b.created_at)
      );
    }

    if (sort === "rating") {
      x.sort(
        (a, b) =>
          (b.rating || 0) - (a.rating || 0)
      );
    }

    if (sort === "duration") {
      x.sort(
        (a, b) =>
          (b.duration_minutes || 0) -
          (a.duration_minutes || 0)
      );
    }

    if (sort === "watched") {
      x.sort((a, b) =>
        (b.date_watched || "").localeCompare(
          a.date_watched || ""
        )
      );
    }

    return x;
  }, [archives, category, sort, search]);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  }

  async function deleteArchive(id: string) {
    if (
      !confirm(
        "Delete this archive and all of its episodes?"
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("archives")
      .delete()
      .eq("id", id);

    if (error) {
      setError(error.message);
      return;
    }

    setArchives((v) =>
      v.filter((a) => a.id !== id)
    );

    setEpisodes((v) =>
      v.filter((e) => e.archive_id !== id)
    );
  }

  async function toggleFavorite(a: Archive) {
    const { data, error } = await supabase
      .from("archives")
      .update({
        favorite: !a.favorite,
      })
      .eq("id", a.id)
      .select()
      .single();

    if (error) {
      setError(error.message);
      return;
    }

    if (data) {
      setArchives((v) =>
        v.map((x) =>
          x.id === a.id ? data : x
        )
      );
    }
  }

  if (loading) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <div className="auth-card-top">
            <span />
            <span />
            <span />
          </div>

          <div className="auth-container">
            <div className="auth-heading">
              <p className="eyebrow">
                THE LITTLE ARCHIVE
              </p>

              <h2>Opening your archive.</h2>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard">

      {/* ======================================================
          TOP BAR
      ====================================================== */}

      <header className="topbar">
        <div className="archive-wordmark">
          <span>the little</span>
          <strong>archive.</strong>
        </div>

        <div className="topbar-actions">
          <button
            className="btn"
            onClick={() => {
              setEditing(null);
              setError("");
              setModal(true);
            }}
          >
            <Plus size={16} />
            <span>Add archive</span>
          </button>

          <button
            className="btn secondary"
            onClick={logout}
            title="Log out"
          >
            <LogOut size={16} />
            <span>Log out</span>
          </button>
        </div>
      </header>


      {/* ======================================================
          MAIN LAYOUT
      ====================================================== */}

      <div className="content-layout">

        {/* ====================================================
            ARCHIVE
        ==================================================== */}

        <section className="main-column">

          <div className="archive-main-panel panel">

            <div className="archive-header">
              <div>
                <div className="section-kicker">
                  YOUR COLLECTION
                </div>

                <h1>your archive</h1>

                <p className="archive-subtitle">
                  Everything you’ve watched, kept in
                  one little place.
                </p>
              </div>

              <div className="archive-count">
                <strong>{archives.length}</strong>

                <span>
                  {archives.length === 1
                    ? "watch"
                    : "watches"}
                </span>
              </div>
            </div>


            {/* =================================================
                SEARCH + SORT
            ================================================= */}

            <div className="archive-tools">

              <div className="archive-search">
                <Search size={17} />

                <input
                  className="search-input"
                  placeholder="Search your archive..."
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                />
              </div>

              <div className="archive-sort">
                <SlidersHorizontal size={15} />

                <select
                  className="search-input"
                  value={sort}
                  onChange={(e) =>
                    setSort(e.target.value)
                  }
                >
                  <option value="newest">
                    Newest added
                  </option>

                  <option value="oldest">
                    Oldest added
                  </option>

                  <option value="watched">
                    Recently watched
                  </option>

                  <option value="rating">
                    Highest rated
                  </option>

                  <option value="duration">
                    Longest duration
                  </option>
                </select>
              </div>

              <button
                className="btn secondary reset-button"
                onClick={() => {
                  setCategory("all");
                  setSearch("");
                  setSort("newest");
                }}
              >
                Reset
              </button>

            </div>


            {/* =================================================
                CATEGORIES
            ================================================= */}

            <div className="category-section">

              <div className="category-label">
                Browse by
              </div>

              <div className="category-row">

                {[
                  ["all", "All watches"],
                  ["recent", "Recently watched"],
                  ["favorites", "Favorites"],
                  ["movies", "Movies"],
                  ["series", "Series"],
                  ["anime", "Anime"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    className={`chip ${
                      category === key
                        ? "active"
                        : ""
                    }`}
                    onClick={() =>
                      setCategory(key)
                    }
                  >
                    {label}
                  </button>
                ))}

              </div>

            </div>


            {/* =================================================
                RESULTS
            ================================================= */}

            <div className="archive-results-header">
              <span>
                {filtered.length}{" "}
                {filtered.length === 1
                  ? "result"
                  : "results"}
              </span>
            </div>

            <div className="archive-grid">

              {filtered.length === 0 ? (
                <div
                  className="empty archive-empty"
                  style={{
                    gridColumn: "1 / -1",
                  }}
                >
                  <div className="empty-icon">
                    <Film size={21} />
                  </div>

                  <strong>
                    Your archive is feeling a
                    little empty.
                  </strong>

                  <span>
                    Add your first watch to start
                    filling it.
                  </span>

                  <button
                    className="btn"
                    onClick={() => {
                      setEditing(null);
                      setError("");
                      setModal(true);
                    }}
                  >
                    <Plus size={15} />
                    Add your first archive
                  </button>
                </div>
              ) : (
                filtered.map((a) => (
                  <ArchiveCard
                    key={a.id}
                    archive={a}
                    episodes={episodes.filter(
                      (e) =>
                        e.archive_id === a.id
                    )}
                    supabase={supabase}
                    onFavorite={() =>
                      toggleFavorite(a)
                    }
                    onEdit={() => {
                      setEditing(a);
                      setError("");
                      setModal(true);
                    }}
                    onDelete={() =>
                      deleteArchive(a.id)
                    }
                    onEpisodesChange={load}
                  />
                ))
              )}

            </div>

          </div>

        </section>


        {/* ====================================================
            PROFILE
        ==================================================== */}

        <aside className="profile-column">

          <div className="panel profile-panel">

            <div className="profile-label">
              YOUR PROFILE
            </div>

            <div className="profile-cover">
              {profile?.background_url ? (
                <img
                  src={profile.background_url}
                  alt="Profile background"
                />
              ) : (
                <div className="profile-cover-placeholder">
                  <Sparkles size={22} />
                </div>
              )}
            </div>

            <div className="profile-head">

              {profile?.avatar_url ? (
                <img
                  className="avatar"
                  src={profile.avatar_url}
                  alt="Profile"
                />
              ) : (
                <div className="avatar avatar-placeholder">
                  <UserRound size={25} />
                </div>
              )}

              <div className="profile-identity">

                <div className="profile-name">
                  {profile?.nickname}
                </div>

                <div className="profile-username">
                  @{profile?.username}
                </div>

              </div>

            </div>

            <div className="profile-content">

              {profile?.pronouns && (
                <div className="profile-pronouns">
                  {profile.pronouns}
                </div>
              )}

              <p className="profile-bio">
                {profile?.bio ||
                  "A little space for your watching life."}
              </p>

              <div className="tag-list">
                {(profile?.tags || []).map(
                  (tag) => (
                    <span
                      className="tag"
                      key={tag}
                    >
                      {tag}
                    </span>
                  )
                )}
              </div>

              <button
                className="profile-edit-button"
                onClick={() =>
                  setProfileModal(true)
                }
              >
                <Pencil size={14} />
                Edit profile
              </button>

            </div>

          </div>


          {/* =================================================
              PROFILE STATS
          ================================================= */}

          <div className="profile-stats panel">

            <div className="mini-stat">
              <strong>
                {
                  archives.filter(
                    (a) =>
                      a.content_type ===
                      "movie"
                  ).length
                }
              </strong>

              <span>movies</span>
            </div>

            <div className="mini-stat-divider" />

            <div className="mini-stat">
              <strong>
                {
                  archives.filter(
                    (a) =>
                      a.content_type ===
                      "series"
                  ).length
                }
              </strong>

              <span>series</span>
            </div>

            <div className="mini-stat-divider" />

            <div className="mini-stat">
              <strong>
                {
                  archives.filter(
                    (a) =>
                      a.content_type ===
                      "anime"
                  ).length
                }
              </strong>

              <span>anime</span>
            </div>

            <div className="mini-stat-divider" />

            <div className="mini-stat">
              <strong>
                {
                  archives.filter(
                    (a) => a.favorite
                  ).length
                }
              </strong>

              <span>favorites</span>
            </div>

          </div>

        </aside>

      </div>


      {/* ======================================================
          ARCHIVE MODAL
      ====================================================== */}

      {modal && (
        <ArchiveModal
          supabase={supabase}
          close={() => setModal(false)}
          existing={editing}
          refresh={load}
          setError={setError}
          error={error}
        />
      )}


      {/* ======================================================
          PROFILE MODAL
      ====================================================== */}

      {profileModal && profile && (
        <ProfileModal
          supabase={supabase}
          profile={profile}
          close={() => setProfileModal(false)}
          refresh={load}
        />
      )}

    </main>
  );
}


/* ============================================================
   ARCHIVE CARD
============================================================ */

function ArchiveCard({
  archive,
  episodes,
  supabase,
  onFavorite,
  onEdit,
  onDelete,
  onEpisodesChange,
}: {
  archive: Archive;
  episodes: Episode[];
  supabase: any;
  onFavorite: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onEpisodesChange: () => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  const isEpisodic =
    archive.content_type === "series" ||
    archive.content_type === "anime" ||
    archive.content_type === "documentary" ||
    archive.content_type === "tvseries";

  const typeIcon =
    archive.content_type === "movie" ? (
      <Film size={13} />
    ) : archive.content_type === "series" ? (
      <Tv size={13} />
    ) : (
      <Sparkles size={13} />
    );

  const rating = archive.rating
    ? Math.round(archive.rating)
    : 0;

  const watchDate = archive.date_watched
    ? new Date(
        archive.date_watched
      ).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "No watch date";

  const finishedDate = archive.date_finished
    ? new Date(
        archive.date_finished
      ).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not recorded";

  function stopClick(e: React.MouseEvent) {
    e.stopPropagation();
  }

  return (
    <>
      <article
        className="archive-card"
        onClick={() => setDetailsOpen(true)}
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto",
          gap: "18px",
          alignItems: "center",
          cursor: "pointer",
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div className="archive-card-top">
            <div className="archive-type">
              {typeIcon}
              <span>{archive.content_type}</span>
              {isEpisodic && (
                <>
                  <span className="archive-format-divider">·</span>
                  <span>
                    {episodes.length} {episodes.length === 1 ? "episode" : "episodes"}
                  </span>
                </>
              )}
            </div>

            <button
              className={`favorite-button ${
                archive.favorite ? "is-favorite" : ""
              }`}
              onClick={(e) => {
                stopClick(e);
                onFavorite();
              }}
              title="Favorite"
              aria-label="Favorite"
              type="button"
            >
              <Heart
                size={17}
                fill={
                  archive.favorite
                    ? "currentColor"
                    : "none"
                }
              />
            </button>
          </div>

          <div className="archive-title">
            {archive.title}
          </div>

          <div className="archive-card-info">
            <span>{watchDate}</span>

            {archive.duration_minutes ? (
              <>
                <span className="info-dot">·</span>
                <span>{archive.duration_minutes} min</span>
              </>
            ) : null}
          </div>

          <div className="archive-rating">
            <span className="stars">
              {"★".repeat(rating)}
              {"☆".repeat(5 - rating)}
            </span>

            <span className="rating-number">
              {archive.rating ?? "—"}/5
            </span>
          </div>
        </div>

        <div
          className="archive-card-actions"
          onClick={stopClick}
          style={{
            alignSelf: "stretch",
            display: "flex",
            alignItems: "center",
          }}
        >
          <button
            className="card-action edit-action"
            onClick={onEdit}
            type="button"
          >
            <Pencil size={13} />
            Edit
          </button>

          <button
            className="card-action delete-action"
            onClick={onDelete}
            title="Delete archive"
            type="button"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </article>

      {detailsOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setDetailsOpen(false);
            }
          }}
        >
          <div
            className="modal archive-modal"
            onMouseDown={stopClick}
          >
            <div className="modal-header">
              <div>
                <div className="modal-kicker">
                  YOUR ARCHIVE
                </div>

                <h2>{archive.title}</h2>
              </div>

              <button
                className="modal-close"
                onClick={() => setDetailsOpen(false)}
                type="button"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="form-grid">
              <div className="field">
                <label>Type</label>
                <div className="small muted">
                  {typeIcon} {archive.content_type}
                </div>
              </div>

              <div className="field">
                <label>Rating</label>
                <div className="archive-rating">
                  <span className="stars">
                    {"★".repeat(rating)}
                    {"☆".repeat(5 - rating)}
                  </span>
                  <span className="rating-number">
                    {archive.rating ?? "—"}/5
                  </span>
                </div>
              </div>

              <div className="field">
                <label>Date watched</label>
                <div className="small muted">
                  {watchDate}
                </div>
              </div>

              <div className="field">
                <label>Date finished</label>
                <div className="small muted">
                  {finishedDate}
                </div>
              </div>

              {archive.duration_minutes ? (
                <div className="field">
                  <label>Duration</label>
                  <div className="small muted">
                    {archive.duration_minutes} minutes
                  </div>
                </div>
              ) : null}

              {archive.actors.length > 0 && (
                <div className="field full">
                  <label>Actors / cast</label>
                  <div className="small muted">
                    {archive.actors.join(", ")}
                  </div>
                </div>
              )}

              {archive.review_notes && (
                <div className="field full">
                  <label>Review / notes</label>
                  <div className="small muted">
                    {archive.review_notes}
                  </div>
                </div>
              )}
            </div>

            {isEpisodic && (
              <div className="episodic-info-box">
                <Layers size={17} />
                <div>
                  <strong>Episodes</strong>
                  <span>
                    {episodes.length === 0
                      ? "No episodes added yet."
                      : `${episodes.length} ${episodes.length === 1 ? "episode" : "episodes"} in this archive.`}
                  </span>
                </div>
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={() => setDetailsOpen(false)}
              >
                Close
              </button>

              <button
                type="button"
                className="btn"
                onClick={() => {
                  setDetailsOpen(false);
                  onEdit();
                }}
              >
                <Pencil size={14} />
                Edit archive
              </button>
            </div>

            {isEpisodic && (
              <div className="archive-episodes">
                <EpisodeManager
                  archive={archive}
                  episodes={episodes}
                  supabase={supabase}
                  onChange={onEpisodesChange}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ============================================================
   EPISODE MANAGER
============================================================ */

function EpisodeManager({
  archive,
  episodes,
  supabase,
  onChange,
}: {
  archive: Archive;
  episodes: Episode[];
  supabase: any;
  onChange: () => void;
}) {
  const [adding, setAdding] = useState(false);

  const [episodeNumber, setEpisodeNumber] =
    useState(
      episodes.length > 0
        ? Math.max(
            ...episodes.map(
              (e) => e.episode_number
            )
          ) + 1
        : 1
    );

  const [title, setTitle] = useState("");

  const [rating, setRating] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [editingEpisode, setEditingEpisode] =
    useState<string | null>(null);

  function startEdit(episode: Episode) {
    setEditingEpisode(episode.id);

    setTitle(
      episode.title || ""
    );

    setRating(
      episode.rating !== null
        ? String(episode.rating)
        : ""
    );

    setNotes(
      episode.notes || ""
    );

    setEpisodeNumber(
      episode.episode_number
    );

    setAdding(true);
  }

  function resetForm() {
    setAdding(false);
    setEditingEpisode(null);

    setTitle("");
    setRating("");
    setNotes("");

    setEpisodeNumber(
      episodes.length > 0
        ? Math.max(
            ...episodes.map(
              (e) => e.episode_number
            )
          ) + 1
        : 1
    );
  }

  async function saveEpisode(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!title.trim()) {
      return;
    }

    const numericRating =
      rating === ""
        ? null
        : Number(rating);

    if (
      numericRating !== null &&
      (numericRating < 0 ||
        numericRating > 5)
    ) {
      alert(
        "Episode rating must be between 0 and 5."
      );
      return;
    }

    setSaving(true);

    const payload = {
      archive_id: archive.id,
      episode_number:
        Number(episodeNumber),
      title: title.trim(),
      rating: numericRating,
      notes:
        notes.trim() || null,
    };

    let result;

    if (editingEpisode) {
      result = await supabase
        .from("archive_episodes")
        .update({
          episode_number:
            payload.episode_number,
          title: payload.title,
          rating: payload.rating,
          notes: payload.notes,
        })
        .eq("id", editingEpisode);
    } else {
      result = await supabase
        .from("archive_episodes")
        .insert(payload);
    }

    if (result.error) {
      alert(
        result.error.code === "23505"
          ? "That episode number already exists."
          : result.error.message
      );

      setSaving(false);
      return;
    }

    resetForm();
    onChange();

    setSaving(false);
  }

  async function deleteEpisode(
    id: string
  ) {
    if (
      !confirm(
        "Delete this episode?"
      )
    ) {
      return;
    }

    const { error } =
      await supabase
        .from("archive_episodes")
        .delete()
        .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    onChange();
  }

  return (
    <div className="episode-manager">

      {episodes.length > 0 && (
        <div className="episode-list">

          {episodes.map((episode) => {

            const episodeRating =
              episode.rating
                ? Math.round(
                    episode.rating
                  )
                : 0;

            return (
              <div
                className="episode-row"
                key={episode.id}
              >

                <div className="episode-number">
                  EP.{" "}
                  {episode.episode_number}
                </div>

                <div className="episode-details">

                  <strong>
                    {episode.title ||
                      `Episode ${episode.episode_number}`}
                  </strong>

                  <div className="episode-rating">

                    <span className="stars">
                      {"★".repeat(
                        episodeRating
                      )}

                      {"☆".repeat(
                        5 - episodeRating
                      )}
                    </span>

                    <span>
                      {episode.rating ??
                        "—"}/5
                    </span>

                  </div>

                  {episode.notes && (
                    <p>
                      {episode.notes}
                    </p>
                  )}

                </div>

                <div className="episode-actions">

                  <button
                    className="link"
                    onClick={() =>
                      startEdit(
                        episode
                      )
                    }
                    title="Edit episode"
                  >
                    <Pencil size={14} />
                  </button>

                  <button
                    className="link"
                    onClick={() =>
                      deleteEpisode(
                        episode.id
                      )
                    }
                    title="Delete episode"
                  >
                    <Trash2 size={14} />
                  </button>

                </div>

              </div>
            );
          })}

        </div>
      )}


      {!adding ? (
        <button
          className="episode-add-button"
          onClick={() =>
            setAdding(true)
          }
        >
          <Plus size={14} />
          Add episode
        </button>
      ) : (
        <form
          className="episode-form"
          onSubmit={saveEpisode}
        >

          <div className="episode-form-header">

            <strong>
              {editingEpisode
                ? "Edit episode"
                : "Add episode"}
            </strong>

            <button
              type="button"
              className="link"
              onClick={resetForm}
            >
              <X size={15} />
            </button>

          </div>


          <div className="episode-form-grid">

            <div className="field">

              <label>
                Episode #
              </label>

              <input
                type="number"
                min="1"
                value={episodeNumber}
                onChange={(e) =>
                  setEpisodeNumber(
                    Number(
                      e.target.value
                    )
                  )
                }
              />

            </div>


            <div className="field">

              <label>
                Episode name
              </label>

              <input
                required
                value={title}
                onChange={(e) =>
                  setTitle(
                    e.target.value
                  )
                }
                placeholder="Episode title"
              />

            </div>


            <div className="field">

              <label>
                Rating / 5
              </label>

              <input
                type="number"
                min="0"
                max="5"
                step="0.5"
                value={rating}
                onChange={(e) =>
                  setRating(
                    e.target.value
                  )
                }
                placeholder="0–5"
              />

            </div>


            <div className="field full">

              <label>
                Episode notes
              </label>

              <textarea
                rows={3}
                value={notes}
                onChange={(e) =>
                  setNotes(
                    e.target.value
                  )
                }
                placeholder="What happened? What did you think?"
              />

            </div>

          </div>


          <div className="episode-form-actions">

            <button
              type="button"
              className="btn secondary"
              onClick={resetForm}
            >
              Cancel
            </button>

            <button
              className="btn"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : editingEpisode
                ? "Save episode"
                : "Add episode"}
            </button>

          </div>

        </form>
      )}

    </div>
  );
}


/* ============================================================
   ARCHIVE MODAL
============================================================ */

function ArchiveModal({
  supabase,
  close,
  existing,
  refresh,
  setError,
  error,
}: {
  supabase: any;
  close: () => void;
  existing: Archive | null;
  refresh: () => void;
  setError: (s: string) => void;
  error: string;
}) {
  const [title, setTitle] =
    useState(existing?.title || "");

  const [contentType, setContentType] =
    useState(
      existing?.content_type || "movie"
    );

  const viewingFormat =
    contentType === "series" ||
    contentType === "anime" ||
    contentType === "documentary" ||
    contentType === "realityshow"
      ? "episodic"
      : "standalone";

  const [watched, setWatched] =
    useState(
      existing?.date_watched || ""
    );

  const [finished, setFinished] =
    useState(
      existing?.date_finished || ""
    );

  const [rating, setRating] =
    useState(
      String(existing?.rating ?? "")
    );

  const [duration, setDuration] =
    useState(
      String(
        existing?.duration_minutes ?? ""
      )
    );

  const [actors, setActors] =
    useState(
      existing?.actors.join(", ") || ""
    );

  const [notes, setNotes] =
    useState(
      existing?.review_notes || ""
    );

  const [saving, setSaving] =
    useState(false);

  async function save(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setSaving(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError(
        "Your session has expired. Please log in again."
      );

      setSaving(false);
      return;
    }

    if (!title.trim()) {
      setError(
        "Please enter a title."
      );

      setSaving(false);
      return;
    }

    const numericRating =
      rating === ""
        ? null
        : Number(rating);

    if (
      numericRating !== null &&
      (numericRating < 0 ||
        numericRating > 5)
    ) {
      setError(
        "Overall rating must be between 0 and 5."
      );

      setSaving(false);
      return;
    }

    const payload = {
      user_id: user.id,

      title: title.trim(),

      content_type:
        contentType,

      viewing_format:
        viewingFormat,

      date_watched:
        watched || null,

      date_finished:
        finished || null,

      rating:
        numericRating,

      duration_minutes:
        duration
          ? Number(duration)
          : null,

      actors: actors
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),

      review_notes:
        notes.trim() || null,
    };

    let result;

    if (existing) {
      result = await supabase
        .from("archives")
        .update(payload)
        .eq("id", existing.id)
        .select()
        .single();

      /*
       * If the archive was changed from episodic
       * to standalone, remove its episodes.
       */
      if (
        !result.error &&
        viewingFormat === "standalone"
      ) {
        await supabase
          .from("archive_episodes")
          .delete()
          .eq(
            "archive_id",
            existing.id
          );
      }
    } else {
      result = await supabase
        .from("archives")
        .insert(payload)
        .select()
        .single();
    }

    if (result.error) {
      setError(
        result.error.message
      );

      setSaving(false);
      return;
    }

    await refresh();

    close();

    setSaving(false);
  }

  return (
    <div className="modal-backdrop">

      <div className="modal archive-modal">

        <div className="modal-header">

          <div>

            <div className="modal-kicker">
              {existing
                ? "EDIT YOUR ARCHIVE"
                : "ADD TO YOUR ARCHIVE"}
            </div>

            <h2>
              {existing
                ? "edit archive"
                : "add new archive"}
            </h2>

          </div>

          <button
            className="modal-close"
            onClick={close}
            type="button"
          >
            <X size={18} />
          </button>

        </div>


        <form onSubmit={save}>

          <div className="form-grid">

            {/* TITLE */}

            <div className="field full">

              <label>
                Title
              </label>

              <input
                required
                value={title}
                onChange={(e) =>
                  setTitle(
                    e.target.value
                  )
                }
                placeholder="What did you watch?"
              />

            </div>


            {/* TYPE */}

            <div className="field">

              <label>
                Type
              </label>

              <select
                value={contentType}
                onChange={(e) =>
                  setContentType(
                    e.target.value
                  )
                }
              >
                {types.map((type) => (
                  <option
                    key={type}
                    value={type}
                  >
                    {type === "movie"
                      ? "Movie"
                      : type === "series"
                      ? "Series"
                      : type === "anime"
                      ? "Anime"
                      : type === "documentary"
                      ? "Documentary"
                      : type === "shortfilm"
                      ? "Short Film"
                      : "Other"}
                  </option>
                ))}
              </select>

            </div>


            {/* FORMAT IS DETERMINED BY TYPE */}

            <div className="field">

              <label>
                Viewing
              </label>

              <div className="small muted">
                {viewingFormat === "episodic"
                  ? "Episodes can be tracked for this type."
                  : "This watch is treated as one complete item."}
              </div>

            </div>


            {/* WATCH DATE */}

            <div className="field">

              <label>
                Date watched
              </label>

              <input
                type="date"
                value={watched}
                onChange={(e) =>
                  setWatched(
                    e.target.value
                  )
                }
              />

            </div>


            {/* FINISHED */}

            <div className="field">

              <label>
                Date finished
              </label>

              <input
                type="date"
                value={finished}
                onChange={(e) =>
                  setFinished(
                    e.target.value
                  )
                }
              />

            </div>


            {/* RATING */}

            <div className="field">

              <label>
                Overall rating
              </label>

              <input
                type="number"
                min="0"
                max="5"
                step="0.5"
                value={rating}
                onChange={(e) =>
                  setRating(
                    e.target.value
                  )
                }
                placeholder="0–5"
              />

            </div>


            {/* DURATION */}

            <div className="field">

              <label>
                Duration
              </label>

              <input
                type="number"
                min="0"
                value={duration}
                onChange={(e) =>
                  setDuration(
                    e.target.value
                  )
                }
                placeholder="Minutes"
              />

            </div>


            {/* CAST */}

            <div className="field full">

              <label>
                Actors / cast
              </label>

              <input
                value={actors}
                onChange={(e) =>
                  setActors(
                    e.target.value
                  )
                }
                placeholder="Actor 1, Actor 2, Actor 3"
              />

            </div>


            {/* NOTES */}

            <div className="field full">

              <label>
                Review / notes
              </label>

              <textarea
                rows={5}
                value={notes}
                onChange={(e) =>
                  setNotes(
                    e.target.value
                  )
                }
                placeholder="What do you want to remember about it?"
              />

            </div>

          </div>


          {/* =================================================
              EPISODIC EXPLANATION
          ================================================= */}

          {viewingFormat ===
            "episodic" && (
            <div className="episodic-info-box">

              <Layers size={17} />

              <div>

                <strong>
                  This is an episodic archive
                </strong>

                <span>
                  Save this archive first,
                  then use its Episodes
                  section to add individual
                  episode names, ratings,
                  and notes.
                </span>

              </div>

            </div>
          )}


          {error && (
            <div
              className="error"
              role="alert"
            >
              {error}
            </div>
          )}


          <div className="form-actions">

            <button
              type="button"
              className="btn secondary"
              onClick={close}
            >
              Cancel
            </button>

            <button
              className="btn"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : existing
                ? "Save changes"
                : "Add to archive"}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}


/* ============================================================
   PROFILE MODAL
============================================================ */

function ProfileModal({
  supabase,
  profile,
  close,
  refresh,
}: {
  supabase: any;
  profile: Profile;
  close: () => void;
  refresh: () => void;
}) {
  const [nickname, setNickname] =
    useState(
      profile.nickname || ""
    );

  const [username, setUsername] =
    useState(
      profile.username || ""
    );

  const [pronouns, setPronouns] =
    useState(
      profile.pronouns || ""
    );

  const [bio, setBio] =
    useState(profile.bio || "");

  const [avatar, setAvatar] =
    useState(
      profile.avatar_url || ""
    );

  const [background, setBackground] =
    useState(
      profile.background_url || ""
    );

  const [tags, setTags] =
    useState(
      (profile.tags || []).join(", ")
    );

  const [error, setError] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  async function save(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setError("");
    setSaving(true);

    const cleanUsername =
      username.toLowerCase().trim();

    if (
      !/^[a-zA-Z0-9_]{3,24}$/.test(
        cleanUsername
      )
    ) {
      setError(
        "Username must be 3–24 characters and use only letters, numbers, or underscores."
      );

      setSaving(false);
      return;
    }

    const { error } =
      await supabase
        .from("profiles")
        .update({
          nickname:
            nickname.trim(),

          username:
            cleanUsername,

          pronouns:
            pronouns.trim() ||
            null,

          bio:
            bio.trim() || null,

          avatar_url:
            avatar.trim() || null,

          background_url:
            background.trim() ||
            null,

          tags: tags
            .split(",")
            .map((s) =>
              s.trim()
            )
            .filter(Boolean),
        })
        .eq("id", profile.id);

    if (error) {
      setError(
        error.code === "23505"
          ? "That username is already taken."
          : error.message
      );

      setSaving(false);
      return;
    }

    await refresh();

    close();

    setSaving(false);
  }

  return (
    <div className="modal-backdrop">

      <div className="modal profile-modal">

        <div className="modal-header">

          <div>

            <div className="modal-kicker">
              YOUR LITTLE SPACE
            </div>

            <h2>
              edit profile
            </h2>

          </div>

          <button
            className="modal-close"
            onClick={close}
            type="button"
          >
            <X size={18} />
          </button>

        </div>


        <form onSubmit={save}>

          <div className="form-grid">

            <div className="field">

              <label>
                Nickname
              </label>

              <input
                value={nickname}
                onChange={(e) =>
                  setNickname(
                    e.target.value
                  )
                }
                placeholder="Your name"
              />

            </div>


            <div className="field">

              <label>
                Username
              </label>

              <input
                value={username}
                onChange={(e) =>
                  setUsername(
                    e.target.value
                  )
                }
                placeholder="your_username"
              />

            </div>


            <div className="field">

              <label>
                Pronouns
              </label>

              <input
                value={pronouns}
                onChange={(e) =>
                  setPronouns(
                    e.target.value
                  )
                }
                placeholder="she/her, they/them..."
              />

            </div>


            <div className="field">

              <label>
                Profile picture URL
              </label>

              <input
                value={avatar}
                onChange={(e) =>
                  setAvatar(
                    e.target.value
                  )
                }
                placeholder="https://..."
              />

            </div>


            <div className="field full">

              <label>
                Profile background picture URL
              </label>

              <input
                value={background}
                onChange={(e) =>
                  setBackground(
                    e.target.value
                  )
                }
                placeholder="https://..."
              />

            </div>


            <div className="field full">

              <label>
                Tags
              </label>

              <input
                value={tags}
                onChange={(e) =>
                  setTags(
                    e.target.value
                  )
                }
                placeholder="cinephile, comfort movies, animation"
              />

              <span className="small muted">
                Separate tags with commas.
              </span>

            </div>


            <div className="field full">

              <label>
                Bio
              </label>

              <textarea
                rows={4}
                value={bio}
                onChange={(e) =>
                  setBio(
                    e.target.value
                  )
                }
                placeholder="Tell us a little about your watching life..."
              />

            </div>

          </div>


          {error && (
            <div
              className="error"
              role="alert"
            >
              {error}
            </div>
          )}


          <div className="form-actions">

            <button
              type="button"
              className="btn secondary"
              onClick={close}
            >
              Cancel
            </button>

            <button
              className="btn"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : "Save profile"}
            </button>

          </div>

        </form>

      </div>

    </div>
  );
}