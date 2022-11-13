import Link from 'next/link'
import React from 'react'

const Index = () => {
  return (
    <div style={{ display: 'grid', placeContent: 'center', height: '100vh' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
        }}>
        <Link href='/examples/basic'>
          <h1>Basic</h1>
        </Link>
        <Link href='/examples/clusters'>
          <h1>Clusters</h1>
        </Link>
        <Link href='/examples/zustand'>
          <h1>Zustand (simplest)</h1>
        </Link>
      </div>
    </div>
  )
}

export default Index
