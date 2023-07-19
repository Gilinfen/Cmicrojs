import cmicrojs from 'cmicrojs'

cmicrojs([
  {
    name: 'rollup',
    display: 'Rollup',
    color: 'red',
    variants: [
      {
        name: 'rollup',
        display: 'TypeScript',
        color: 'blue'
      }
    ]
  },
  {
    name: 'react',
    display: 'React',
    color: 'cyan',
    variants: [
      {
        name: 'react',
        display: 'JavaScript',
        color: 'yellow'
      },
      {
        name: 'react-ts',
        display: 'TypeScript',
        color: 'blue'
      }
    ]
  },
  {
    name: 'vue',
    display: 'Vue',
    color: 'green',
    variants: [
      {
        name: 'vue',
        display: 'JavaScript',
        color: 'yellow'
      },
      {
        name: 'vue-ts',
        display: 'TypeScript',
        color: 'blue'
      }
    ]
  }
]).catch(e => {
  console.log(e)
})
