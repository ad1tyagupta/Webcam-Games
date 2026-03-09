import type { GameDefinition } from '../types/arcade'

export const gameDefinitions: GameDefinition[] = [
  {
    id: 'snake',
    route: '/play/snake',
    title: 'Snake Signal',
    imagePath: '/game-previews/snake.svg',
    description: 'Guide a neon snake by changing the angle of your fingers.',
    status: 'playable',
    accent: '#ffd84d',
    difficulty: 'Easy',
    controlSummary: 'Tilt your fingers into 4 clear directions to steer the snake.',
  },
  {
    id: 'fruit-ninja',
    route: '/play/fruit-ninja',
    title: 'Fruit Flash',
    imagePath: '/game-previews/fruit-ninja.svg',
    description: 'Slash fruit with fast fingertip swipes and avoid explosive traps.',
    status: 'playable',
    accent: '#ff7a59',
    difficulty: 'Medium',
    controlSummary: 'Your index fingertip becomes the blade; only fast swipes count.',
  },
  {
    id: 'pool',
    route: '/play/pool',
    title: 'Pocket Pulse',
    imagePath: '/game-previews/pool.svg',
    description: 'Aim the cue with your hand and load power by pinching back.',
    status: 'playable',
    accent: '#3dd6c6',
    difficulty: 'Hard',
    controlSummary: 'Point to aim, pinch and pull back for power, then release to shoot.',
  },
  {
    id: 'mini-golf',
    route: '/play/mini-golf',
    title: 'Putt Parade',
    imagePath: '/game-previews/mini-golf.svg',
    description: 'Line up toy-box putts and flick your way through playful obstacle holes.',
    status: 'playable',
    accent: '#7bd968',
    difficulty: 'Medium',
    controlSummary: 'Rotate aim with your hand, drag backward to charge, release to putt.',
  },
]

export const gameDefinitionMap = Object.fromEntries(
  gameDefinitions.map((game) => [game.id, game] as const),
)
