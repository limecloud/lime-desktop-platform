import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import { installDiagramZoom } from './diagramZoom'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp(ctx) {
    DefaultTheme.enhanceApp?.(ctx)
    installDiagramZoom()
  }
} satisfies Theme
