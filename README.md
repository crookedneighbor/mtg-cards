Scryfall Client
---------------

A simple wrapper for the [Scryfall API](https://scryfall.com/docs/api).

# Installation

```
npm install --save scryfall-client
```

# Basic Usage

You can make a get request to any of the [API endpoints](https://scryfall.com/docs/api). It will return a Promise that resolves with the result.

```js
var scryfall = require('scryfall-client')

scryfall('cards/random').then(function (card) {
  card // a random card
})
```

You can pass a second argument that will be converted to a query string:

```js
scryfall('cards/search', {
  q: 'o:vigilance t:equipment'
}).then(function (list) {
  list.forEach(function (card) {
    console.log(card.name)
  })
})
```

There is one key difference between the response objects returned from the raw API and this module. For endpoints that return the [list object](https://scryfall.com/docs/api/lists), the raw API returns an object with some properties about the list (`has_more`, `next_page`, `total_cards`) and a `data` property that is an array of other API objects (cards, prints, rulings, etc). This module returns an Array-like object of the data directly, with the properties attached to the object.


```js
scryfall('cards/search', {
  q: 'o:vigilance t:equipment'
}).then(function (list) {
  list.has_more // whether or not there is an additional page of results, `true` or `false`
  list.total_cards // the total number of cards returned from search

  var names = list.map(function (card) { // the list object can use any Array method
    return card.name
  })
})
```


If your request returns no results or is otherwise unsuccessful, the Promise will reject.

```js
scryfall('cards/search', {
  q: 'foobarbaz'
}).then(function (list) {
  // will never get here
}).catch(function (err) {
  err // a 404 error
})
```

# API Objects

As a convenience, there are a number of API objects with special methods.

## Card

Representing a [card object](https://scryfall.com/docs/api/cards)

### getRulings() -> Promise<List>

Returns a Promise that resolves with a list of [rulings objects](https://scryfall.com/docs/api/rulings)

```js
scryfall('cards/named', {
  fuzzy: 'aust com'
}).then(function (card) {
  return card.getRulings()
}).then(function (list) {
  list.forEach(function (ruling) {
    console.log(ruling.published_at)
    console.log(ruling.comment)
  })
})
```

### getSet() -> Promise<Set>

Returns a Promise that resolves with the [set object](https://scryfall.com/docs/api/sets) for the card.

```js
scryfall('cards/named', {
  exact: 'the Scarab God'
}).then(function (card) {
  return card.getSet()
}).then(function (set) {
  set.name // the name of the set
})
```

### getPrints() -> Promise<List>

Returns a Promise that resolves with a list of [card objects](https://scryfall.com/docs/api/cards) for each printing of the card.

```js
scryfall('cards/named', {
  exact: 'windfall'
}).then(function (card) {
  return card.getPrints()
}).then(function (list) {
  var sets = list.map(function (card) {
    return card.set
  })
})
```

### isLegal(String format) -> Boolean

Returns true or false for provided format. As of the writing of this documentation, the valid values are:

```
'standard'
'future'
'frontier'
'modern'
'legacy'
'pauper'
'vintage'
'penny'
'commander'
'1v1'
'duel'
'brawl'
```

As more formats are added, `isLegal` will support them automatically (as it takes its list of valid values from the API response itself).

`isLegal` will return `true` if Scryfall lists the card as `legal` or `restricted` and `false` otherwise.

```js
scryfall('cards/search', {
  q: 'format:standard r:r'
}).then(function (list) {
  var aCard = list[0]

  aCard.isLegal('standard') // true
  aCard.isLegal('pauper') // false
})
```

### getImage(String size='normal') -> String

Returns a Promise that resolves with the image url of the specified size. Defaults to the `normal` size. 

As of the writing of this documentation, the valid values are:

```
'small'
'normal'
'large'
'png'
'art_crop'
'border_crop'
```

If additional formats are added, `getImage` will support them automatically (as it takes its list of valid values from the API response itself).

```js
scryfall('cards/named', {
  exact: 'windfall'
}).then(function (card) {
  return card.getImage()
}).then(function (img) {
  img // set an img tag's src to this
})
```

### getBackImage(String size='normal') -> Array<String>

Returns a Promise that resolves with an Array of image urls of the back of the card. In almost all cases, this will resolve with an Array with 1entry that is [Scryfall's URL for the backside of a card](https://img.scryfall.com/errors/missing.jpg). For [transform cards](https://scryfall.com/search?q=layout%3Atransform), it will resolve with an Array with one entry that is the back face of the card. For the front side of [meld cards](https://scryfall.com/search?q=layout%3Ameld), it will resolve with an Array with 1 entry that is the melded version of the card. FOr the back side of [meld cards](https://scryfall.com/search?q=layout%3Ameld), it will resolve with an Array of two urls, which are the two front sides of the card.

The default format parameter is `'normal'`. As of the writing of this documentation, the valid values are:

```
'small'
'normal'
'large'
'png'
'art_crop'
'border_crop'
```

If additional formats are added, `getImage` will support them automatically (as it takes its list of valid values from the API response itself).

If a non-transform or non-meld card is used with `getBackImage`, the size parameter will be ignored.

```js
// A Magic card without a back face
scryfall('cards/named', {
  exact: 'windfall'
}).then(function (card) {
  return card.getBackImage()
}).then(function (imgs) {
  imgs[0] // https://img.scryfall.com/errors/missing.jpg
})

// A transform card
scryfall('cards/named', {
  exact: 'docent of perfection'
}).then(function (card) {
  return card.getBackImage()
}).then(function (imgs) {
  imgs[0] // the img url for Final Iteration
})

// Front side of a meld card
scryfall('cards/named', {
  exact: 'Gisela, the Broken Blade'
}).then(function (card) {
  return card.getBackImage()
}).then(function (imgs) {
  imgs[0] // the img url for Brisela, Voice of Nightmares
})

// Back side of a meld card
scryfall('cards/named', {
  exact: 'Brisela, Voice of Nightmares'
}).then(function (card) {
  return card.getBackImage()
}).then(function (imgs) {
  imgs[0] // the img url for Bruna, the Fading Light 
  imgs[1] // the img url for Gisela, the Broken Blade
})
```

This is, admittedly, a bit of a wonky design pattern, but necessary to accomadate meld cards. If you have a better idea for it, suggestions and PRs are welcome!

## List

An object representing a [list object](https://scryfall.com/docs/api/lists). This is an Array like object where the entries are the `data` attribute from the raw API. The rest of the properties are present on the `List`.

### next() -> Promise<List>

If the `has_more` property is `true`, then `next()` can be called to get the next page of results.

```js
function collectCards (list, allCards) {
  allCards = allCards || []
  allCards.push.apply(allCards, list)
  
  if (!list.has_more) {
    return allCards
  }

  return list.next().then(function (newList) {
    return collectCards(newList, allCards)
  })
}

scryfall('cards/search', {
  q: 'format:standard r:r'
}).then(function (list) {
  return collectCards(list)
}).then(function (allRareCardsInStandard) {
  // do something!!
})
```

## Set

An object represnting a [set object](https://scryfall.com/docs/api/sets).

### getCards() -> List<Card>

Resolves with a list containing all the cards in the set.

```js
scryfall('sets/dom').then(function (set) {
  return set.getCards()
}).then(function (list) {
  list // a list of cards for the set
})
```

## Other Objects

Any other objects are wrapped in a `GenericScryfallResponse` object.

# Contributing Guidelines

## Code Style

This code is intentionally written in ES5 without any transpilers so that it can be built for the browser without the need to use transpilers such as Babel.

The code base uses [Standard](https://www.npmjs.com/package/standard).

## Testing

To lint and run the unit tests, simply run:

```
npm test
```

To run just the unit tests, run:

```
npm run test:unit
``

To run just the linting command, run:

```
npm run lint
``

To run the integration tests, run:

```
npm run test:integration
```

To run the publishing test, run:

```
npm run test:publishing
```

## Bugs

If you find a bug, feel free to [open an issue](https://github.com/crookedneighbor/scryfall-client/issues/new) or [a Pull Request](https://github.com/crookedneighbor/scryfall-client/compare).