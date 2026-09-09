'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '../lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Plus, Search, LogOut, Pencil, Trash2, X, Heart } from 'lucide-react';

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
  episode_number: number;
  title: string | null;
  rating: number | null;
  notes: string | null;
};

const types = ['movie', 'series', 'anime', 'other'];

export default function Dashboard() {
  const supabase = createClient();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [archives, setArchives] = useState<Archive[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('newest');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [profileModal, setProfileModal] = useState(false);
  const [editing, setEditing] = useState<Archive | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth');
      return;
    }

    let p = await supabase.from('profiles').select('*').eq('id', user.id).single();

    if (!p.data) {
      await supabase.from('profiles').insert({
        id: user.id,
        nickname: user.user_metadata?.nickname || 'New archivist',
        username: user.user_metadata?.username || `user_${user.id.slice(0, 8)}`,
      });
      p = await supabase.from('profiles').select('*').eq('id', user.id).single();
    }

    setProfile(p.data);

    const a = await supabase
      .from('archives')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    setArchives(a.data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let x = [...archives];

    if (category === 'favorites') x = x.filter((a) => a.favorite);
    if (category === 'movies') x = x.filter((a) => a.content_type === 'movie');
    if (category === 'series') x = x.filter((a) => a.content_type === 'series');
    if (category === 'anime') x = x.filter((a) => a.content_type === 'anime');

    const q = search.trim().toLowerCase();
    if (q) {
      x = x.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.actors.some((v) => v.toLowerCase().includes(q)) ||
          (a.review_notes || '').toLowerCase().includes(q)
      );
    }

    if (sort === 'oldest') x.sort((a, b) => a.created_at.localeCompare(b.created_at));
    if (sort === 'rating') x.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    if (sort === 'duration') x.sort((a, b) => (b.duration_minutes || 0) - (a.duration_minutes || 0));
    if (sort === 'watched') x.sort((a, b) => (b.date_watched || '').localeCompare(a.date_watched || ''));

    return x;
  }, [archives, category, sort, search]);

  async function logout() {
    await supabase.auth.signOut();
    router.push('/auth');
    router.refresh();
  }

  async function deleteArchive(id: string) {
    if (!confirm('Delete this archive?')) return;
    await supabase.from('archives').delete().eq('id', id);
    setArchives((v) => v.filter((a) => a.id !== id));
  }

  async function toggleFavorite(a: Archive) {
    const { data } = await supabase
      .from('archives')
      .update({ favorite: !a.favorite })
      .eq('id', a.id)
      .select()
      .single();

    if (data) setArchives((v) => v.map((x) => (x.id === a.id ? data : x)));
  }

  if (loading) return <main className="auth-page">Loading your archive…</main>;

  return (
    <main className="dashboard">
      <header className="topbar">
        <strong>the little archive</strong>
        <div className="topbar-actions">
          <button
            className="btn"
            onClick={() => {
              setEditing(null);
              setModal(true);
            }}
          >
            <Plus size={16} /> Add new archive
          </button>
          <button className="btn secondary" onClick={logout}>
            <LogOut size={16} /> Log out
          </button>
        </div>
      </header>

      <div className="content-layout">
        <section className="main-column">
          <div className="hero">
            <div>
              <h1>your archive</h1>
              <div className="muted">Keep the little details of everything you've watched.</div>
            </div>
          </div>

          <div className="controls">
            <div style={{ position: 'relative' }}>
              <Search size={17} style={{ position: 'absolute', left: 12, top: 12, color: '#777' }} />
              <input
                className="search-input"
                style={{ paddingLeft: 38 }}
                placeholder="Search titles, actors, notes…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className="search-input" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="newest">Newest added</option>
              <option value="oldest">Oldest added</option>
              <option value="watched">Recently watched</option>
              <option value="rating">Star rating</option>
              <option value="duration">Duration</option>
            </select>
            <button
              className="btn secondary"
              onClick={() => {
                setCategory('all');
                setSearch('');
                setSort('newest');
              }}
            >
              Reset
            </button>
          </div>

          <div className="category-row">
            {[
              ['all', 'all watches'],
              ['recent', 'recently watched'],
              ['favorites', 'favorite watches'],
              ['movies', 'movies'],
              ['series', 'series'],
              ['anime', 'anime'],
            ].map(([key, label]) => (
              <button
                key={key}
                className={`chip ${category === key ? 'active' : ''}`}
                onClick={() => setCategory(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="archive-grid">
            {filtered.length === 0 ? (
              <div className="empty" style={{ gridColumn: '1/-1' }}>
                Nothing here yet. Add your first archive.
              </div>
            ) : (
              filtered.map((a) => (
                <article className="archive-card" key={a.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <div className="archive-title">{a.title}</div>
                    <button className="link" onClick={() => toggleFavorite(a)} title="Favorite">
                      <Heart size={18} fill={a.favorite ? 'currentColor' : 'none'} />
                    </button>
                  </div>

                  <div className="meta">
                    {a.content_type} ·{' '}
                    {a.date_watched ? new Date(a.date_watched).toLocaleDateString() : 'No watch date'}
                  </div>

                  <div className="stars">
                    {'★'.repeat(Math.round(a.rating || 0))}
                    {'☆'.repeat(5 - Math.round(a.rating || 0))}{' '}
                    <span className="small">{a.rating ?? '—'}/5</span>
                  </div>

                  {a.duration_minutes && <div className="meta">{a.duration_minutes} min</div>}

                  {a.actors.length > 0 && <div className="meta">Cast: {a.actors.join(', ')}</div>}

                  {a.review_notes && <div>{a.review_notes}</div>}

                  <div style={{ display: 'flex', gap: 7, marginTop: 'auto' }}>
                    <button
                      className="btn secondary"
                      onClick={() => {
                        setEditing(a);
                        setModal(true);
                      }}
                    >
                      <Pencil size={14} /> Edit
                    </button>
                    <button className="btn danger" onClick={() => deleteArchive(a.id)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        <aside className="profile-column">
          <div className="panel">
            <div className="profile-cover">
              {profile?.background_url && <img src={profile.background_url} alt="Profile background" />}
            </div>
            <div className="profile-head">
              {profile?.avatar_url ? (
                <img className="avatar" src={profile.avatar_url} alt="Profile" />
              ) : (
                <div className="avatar" />
              )}
              <div>
                <div className="profile-name">{profile?.nickname}</div>
                <div className="muted">@{profile?.username}</div>
              </div>
            </div>
            <div style={{ padding: '12px 8px' }}>
              {profile?.pronouns && <div className="small">{profile.pronouns}</div>}
              <p>{profile?.bio || 'No bio yet.'}</p>
              <div className="tag-list">
                {(profile?.tags || []).map((t) => (
                  <span className="tag" key={t}>
                    {t}
                  </span>
                ))}
              </div>
              <div className="profile-actions">
                <button className="btn secondary" onClick={() => setProfileModal(true)}>
                  Edit profile
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>

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

      {profileModal && (
        <ProfileModal
          supabase={supabase}
          profile={profile!}
          close={() => setProfileModal(false)}
          refresh={load}
        />
      )}
    </main>
  );
}

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
  const [title, setTitle] = useState(existing?.title || '');
  const [contentType, setContentType] = useState(existing?.content_type || 'movie');
  const [watched, setWatched] = useState(existing?.date_watched || '');
  const [finished, setFinished] = useState(existing?.date_finished || '');
  const [rating, setRating] = useState(String(existing?.rating ?? ''));
  const [duration, setDuration] = useState(String(existing?.duration_minutes ?? ''));
  const [actors, setActors] = useState(existing?.actors.join(', ') || '');
  const [notes, setNotes] = useState(existing?.review_notes || '');
  const [saving, setSaving] = useState(false);
  const [episodeCount, setEpisodeCount] = useState(1);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      user_id: user.id,
      title: title.trim(),
      content_type: contentType,
      date_watched: watched || null,
      date_finished: finished || null,
      rating: rating ? Number(rating) : null,
      duration_minutes: duration ? Number(duration) : null,
      actors: actors.split(',').map((s) => s.trim()).filter(Boolean),
      review_notes: notes.trim() || null,
    };

    let result;
    if (existing) {
      result = await supabase
        .from('archives')
        .update(payload)
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('archives')
        .insert(payload)
        .select()
        .single();
    }

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    if (!existing && contentType === 'series' && episodeCount > 0) {
      const rows = Array.from({ length: episodeCount }, (_, i) => ({
        archive_id: result.data.id,
        episode_number: i + 1,
      }));
      await supabase.from('archive_episodes').insert(rows);
    }

    await refresh();
    close();
    setSaving(false);
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h2>{existing ? 'edit archive' : 'add new archive'}</h2>
          <button className="link" onClick={close}>
            <X />
          </button>
        </div>
        <form onSubmit={save}>
          <div className="form-grid">
            <div className="field full">
              <label>Film / series name *</label>
              <input required value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="field">
              <label>Type *</label>
              <select value={contentType} onChange={(e) => setContentType(e.target.value)}>
                {types.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Date created</label>
              <input value="Automatically recorded" disabled />
            </div>
            <div className="field">
              <label>Date watched</label>
              <input type="date" value={watched} onChange={(e) => setWatched(e.target.value)} />
            </div>
            <div className="field">
              <label>Date finished</label>
              <input type="date" value={finished} onChange={(e) => setFinished(e.target.value)} />
            </div>
            <div className="field">
              <label>Star rating (0–5)</label>
              <input
                type="number"
                min="0"
                max="5"
                step="0.5"
                value={rating}
                onChange={(e) => setRating(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Duration (minutes)</label>
              <input
                type="number"
                min="0"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
            <div className="field full">
              <label>Actors / cast</label>
              <input
                value={actors}
                onChange={(e) => setActors(e.target.value)}
                placeholder="Actor 1, Actor 2, Actor 3"
              />
            </div>
            <div className="field full">
              <label>Review / notes</label>
              <textarea
                rows={5}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What did you think? Little details you want to remember…"
              />
            </div>
            {contentType === 'series' && !existing && (
              <div className="field">
                <label>Number of episodes</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  value={episodeCount}
                  onChange={(e) => setEpisodeCount(Number(e.target.value) || 1)}
                />
              </div>
            )}
          </div>
          {error && <div className="error">{error}</div>}
          <div className="form-actions">
            <button type="button" className="btn secondary" onClick={close}>
              Cancel
            </button>
            <button className="btn" disabled={saving}>
              {saving ? 'Saving…' : existing ? 'Save changes' : 'Add to archive'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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
  const [nickname, setNickname] = useState(profile.nickname || '');
  const [username, setUsername] = useState(profile.username || '');
  const [pronouns, setPronouns] = useState(profile.pronouns || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [avatar, setAvatar] = useState(profile.avatar_url || '');
  const [background, setBackground] = useState(profile.background_url || '');
  const [tags, setTags] = useState((profile.tags || []).join(', '));
  const [error, setError] = useState('');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
      return setError('Username must be 3–24 characters and use only letters, numbers, or underscores.');
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        nickname: nickname.trim(),
        username: username.toLowerCase().trim(),
        pronouns: pronouns.trim() || null,
        bio: bio.trim() || null,
        avatar_url: avatar.trim() || null,
        background_url: background.trim() || null,
        tags: tags.split(',').map((s) => s.trim()).filter(Boolean),
      })
      .eq('id', profile.id);

    if (error) {
      return setError(error.code === '23505' ? 'That username is already taken.' : error.message);
    }

    await refresh();
    close();
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className="modal-header">
          <h2>edit profile</h2>
          <button className="link" onClick={close}>
            <X />
          </button>
        </div>
        <form onSubmit={save}>
          <div className="form-grid">
            <div className="field">
              <label>Nickname</label>
              <input value={nickname} onChange={(e) => setNickname(e.target.value)} />
            </div>
            <div className="field">
              <label>Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
            <div className="field">
              <label>Pronouns</label>
              <input
                value={pronouns}
                onChange={(e) => setPronouns(e.target.value)}
                placeholder="she/her, they/them…"
              />
            </div>
            <div className="field">
              <label>Profile picture URL</label>
              <input value={avatar} onChange={(e) => setAvatar(e.target.value)} />
            </div>
            <div className="field full">
              <label>Profile background picture URL</label>
              <input value={background} onChange={(e) => setBackground(e.target.value)} />
            </div>
            <div className="field full">
              <label>Tags</label>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="cinephile, comfort movies, animation"
              />
              <span className="small muted">
                You can use your own tags. You can also add site-made tags later.
              </span>
            </div>
            <div className="field full">
              <label>Bio</label>
              <textarea rows={4} value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>
          </div>
          {error && <div className="error">{error}</div>}
          <div className="form-actions">
            <button type="button" className="btn secondary" onClick={close}>
              Cancel
            </button>
            <button className="btn">Save profile</button>
          </div>
        </form>
      </div>
    </div>
  );
}