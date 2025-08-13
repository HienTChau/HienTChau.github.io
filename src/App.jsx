import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import ConvertFile from './ConvertFile'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <ConvertFile />
      
    </>
  )
}

export default App
