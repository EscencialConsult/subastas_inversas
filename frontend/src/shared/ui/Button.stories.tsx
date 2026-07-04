import { Button } from './Button'

export default {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'danger', 'ghost', 'outline', 'link'],
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
    fullWidth: { control: 'boolean' },
  },
}

export const Primary = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
  },
}

export const Secondary = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button',
  },
}

export const Danger = {
  args: {
    variant: 'danger',
    children: 'Danger Button',
  },
}

export const Outline = {
  args: {
    variant: 'outline',
    children: 'Outline Button',
  },
}

export const Loading = {
  args: {
    variant: 'primary',
    loading: true,
    children: 'Loading Button',
  },
}

export const Disabled = {
  args: {
    variant: 'primary',
    disabled: true,
    children: 'Disabled Button',
  },
}
