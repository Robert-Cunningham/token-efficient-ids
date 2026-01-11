```ts
import { languid } from 'lang-uid'
object.id = languid() //=> "imbabweittedalamdefaults"
```

If you want to reduce the ID size (and increase collisions probability), you can pass the size as an argument.

```ts
languid(2) //=> "imbabweitted"
```

Don’t forget to check the safety of your ID size in our ID collision probability calculator.

You can also use a custom alphabet or a random generator.

Non-Secure
By default, Nano ID uses hardware random bytes generation for security and low collision probability. If you are not so concerned with security, you can use it for environments without hardware random generators.

```ts
import { nanoid } from 'languid/non-secure'
const id = languid() //=> "Uakgb_J5m9g-0JDMbcJqLJ"
```
Custom Alphabet or Size
customAlphabet returns a function that allows you to create nanoid with your own alphabet and ID size.

```ts
import { customAlphabet } from 'languid'
const nanoid = customAlphabet('1234567890abcdef', 10)
model.id = nanoid() //=> "4f90d13a42"
```

```ts
import { customAlphabet } from 'nanoid/non-secure'
const nanoid = customAlphabet('1234567890abcdef', 10)
user.id = nanoid()
```

```
import { nolookalikes } from 'nanoid-dictionary';
```