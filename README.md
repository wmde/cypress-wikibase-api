# cypress-wikibase-api
Cypress plugin and utility functions for writing Cypress tests of Wikibase

This module contains Cypress tasks to be used in Cypress browser tests for Wikibase and its extensions.

## Usage example

For example, in the Cypress tests in WikibaseLexeme, we use the API to get data about an entity that we created during our testing:

```javascript
lexemePage.headerId().then( ( lexemeId ) => {
    cy.task( 'MwApi:GetEntityData', { entityId: lexemeId } ).then( ( lexeme ) => {
	expect( lexeme.lemmas[ languageItemsLanguageCode ].value ).to.eq( lemma );
	expect( lexeme.language ).to.eq( languageId );
	expect( lexeme.lexicalCategory ).to.eq( lexicalCategoryId );
    } );
});
```

## Development

When testing changes locally, you can install the checked-out module from the project that you are working on:

```
npm rm cypress-wikibase-api
npm i -D ~/work/cypress-wikibase-api
```

## Contributing

Please file any bugs or issues with our issue-tracker at [phabricator.wikimedia.org](https://phabricator.wikimedia.org/maniphest/task/edit/form/1/?tags=Wikidata,Browser-Tests).

For instruction of how to create a new release, please see [CONTRIBUTING.md](CONTRIBUTING.md)
