// Ruteo principal de la app (simplificado)
import { Providers } from './app/providers/providers'
import { AppRoutes } from './app/routes/routes'

export default function App() {
  return (
    <Providers>
      <AppRoutes />
    </Providers>
  )
}
