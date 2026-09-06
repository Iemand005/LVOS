interface User {
  name: string;
  age: number;
}

// Cast het lege object direct naar de interface 'User'
const user = {} as User; 

Object.defineProperties(user, {
  name: {
    value: 'Alex',
    writable: false
  },
  age: {
    value: 30,
    writable: true
  }
});

// TypeScript herkent nu zowel 'name' als 'age' perfect!
console.log(user.name); 
console.log(user.age);