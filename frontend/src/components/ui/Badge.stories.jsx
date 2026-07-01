import { Badge } from './Badge'

export default {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['success', 'warning', 'error', 'info', 'neutral'],
    },
  },
}

export const Neutral = {
  args: {
    variant: 'neutral',
    children: 'Neutral Badge',
  },
}

export const Success = {
  args: {
    variant: 'success',
    children: 'Success Badge',
  },
}

export const Warning = {
  args: {
    variant: 'warning',
    children: 'Warning Badge',
  },
}

export const Error = {
  args: {
    variant: 'error',
    children: 'Error Badge',
  },
}

export const Info = {
  args: {
    variant: 'info',
    children: 'Info Badge',
  },
}
