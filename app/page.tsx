import { ChatWidget } from '@/components/chat'
import { Wrapper } from '@/components/layout/wrapper'
import { About } from './(portfolio)/_sections/about'
import { Contact } from './(portfolio)/_sections/contact'
import { Experience } from './(portfolio)/_sections/experience'
import { Hero } from './(portfolio)/_sections/hero'
import { NoiseWavesClient } from './(portfolio)/_sections/noise-waves-wrapper'
import { Projects } from './(portfolio)/_sections/projects'

export default function Home() {
  return (
    <Wrapper theme="dark" lenis={{}}>
      <NoiseWavesClient />
      <Hero />
      <About />
      <Experience />
      <Projects />
      <Contact />
      <ChatWidget />
    </Wrapper>
  )
}
