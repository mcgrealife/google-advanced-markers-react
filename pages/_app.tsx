import '../styles/globals.css'
import type { AppProps } from 'next/app'
import Link from 'next/link'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '200px 1fr',
      }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          zIndex: 2,
          backgroundColor: 'white',
          height: '50px',
        }}>
        <Link href='/examples/basic'>
          <h3>Basic</h3>
        </Link>
        <Link href='/examples/clusters'>
          <h3>Clusters</h3>
        </Link>
        <Link href='/examples/zustand'>
          <h3>Zustand (simplest)</h3>
        </Link>
      </div>

      <div>
        <Component {...pageProps} />
      </div>
    </div>
  )
}
