'use client';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">A fatal error occurred</h2>
            <p className="text-gray-600 mb-6">{error.message}</p>
            <button
              onClick={() => reset()}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold"
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}




