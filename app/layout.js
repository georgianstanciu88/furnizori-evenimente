import './globals.css'
import Navbar from '@/components/Navbar'

export const metadata = {
  title: 'EventPro - Furnizori Evenimente Premium',
  description: 'Găsește cei mai buni furnizori pentru evenimentul tău perfect',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ro">
      <body>
        <Navbar />
        <main className="pt-16">
          {children}
        </main>
        <footer className="bg-gray-900 text-white py-12 mt-20">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div>
                <h3 className="text-xl font-bold mb-4">EventPro</h3>
                <p className="text-gray-400">
                  Platforma #1 pentru furnizori de evenimente din România
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Categorii</h4>
                <ul className="space-y-2 text-gray-400">
                  <li>Localuri</li>
                  <li>Fotografi</li>
                  <li>Formații</li>
                  <li>Catering</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Companie</h4>
                <ul className="space-y-2 text-gray-400">
                  <li>Despre noi</li>
                  <li>Contact</li>
                  <li>Termeni</li>
                  <li>Confidențialitate</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Contact</h4>
                <div className="text-gray-400">
                  <p>Email: contact@eventpro.ro</p>
                  <p>Telefon: 0740 123 456</p>
                </div>
              </div>
            </div>
            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
              <p>&copy; 2024 EventPro. Toate drepturile rezervate.</p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}