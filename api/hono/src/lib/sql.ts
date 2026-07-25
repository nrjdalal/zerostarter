// Escapes the LIKE/ILIKE metacharacters so a user-supplied search term matches literally. Postgres treats backslash as the default escape under standard_conforming_strings, so no explicit ESCAPE clause is needed; the term still binds as a parameter, this only stops % and _ from acting as wildcards.
export const escapeLike = (value: string) => value.replace(/[%_\\]/g, "\\$&")
