'use client'

export default function Error({ error, reset }) {
  return (
    <main className="cd-error-page">
      <div className="cd-error-panel">
        <img src="/Takneek.svg" width="40" height="40" alt="Takneek" />
        <h1>Something went wrong</h1>
        <p>{error?.message || 'The dashboard hit an unexpected error.'}</p>
        <button className="cd-google-btn" onClick={() => reset()}>Try again</button>
      </div>
    </main>
  )
}
