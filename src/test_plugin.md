Here’s the full English translation of your Markdown syntax test file:

---

# Markdown Syntax Test File

This file systematically demonstrates all common Markdown syntax elements by category.

---

# Heading Level 1

## Heading Level 2

### Heading Level 3

#### Heading Level 4

##### Heading Level 5

###### Heading Level 6

Alternative syntax for H1 and H2:

# Heading Level 1 Alt

## Heading Level 2 Alt

---

## 2. Text Formatting

**Bold Text** or **also bold this way**

*Italic Text* or *also italic this way*

***Bold and italic*** or ***like this too***

~~Strikethrough Text~~

<u>Underlined Text</u> (HTML)

==Highlighted Text== (extended syntax)

Superscript<sup>text</sup> and Sub<sub>script</sub>

`Inline Code`

---

## 3. Paragraphs and Line Breaks

This is a normal paragraph with text.

This is a second paragraph. There is an empty line between paragraphs.

This is a line with a hard break.
This is the next line (two spaces at the end of the previous line).

---

## 4. Lists

### Unordered Lists

* List item with asterisk
* Second item
    * Nested item
    * Another nested item
        * Double nested
* Back to first level

- List item with dash
- Second item

* List item with plus
* Second item

### Ordered Lists

1. First item
2. Second item
3. Third item
    1. Nested item
    2. Another one
4. Fourth item

### Task Lists

* [x] Completed task
* [ ] Open task
* [ ] Another open task
    * [x] Nested completed task
    * [ ] Nested open task

1. [x] Completed task
2. [ ] Open task
3. [ ] Another open task
    * [x] Nested completed task
    * [ ] Nested open task

---

## 5. Links

[Link with text](https://www.example.com)

[Link with title](https://www.example.com "This is a tooltip")

[https://www.automatic-link.com](https://www.automatic-link.com)

[Reference Link][ref1]

[Relative Link](./documents/file.md)

[Link to heading](#1-headings)

[ref1]: https://www.example.com "Reference link definition"

---

## 6. Images

![Alt text](https://picsum.photos/id/237/200/300 "Optional title")

![Alt text for reference image][img1]

[img1]: https://picsum.photos/id/237/200/300 "Reference image"

Image with link:
[![Alt text](https://picsum.photos/id/237/200/300)](https://www.example.com)

---

## 7. Code

### Inline Code

Use the `print()` function in Python.

### Code Blocks

```
Simple code block without syntax highlighting
Line 2
Line 3
```

```python
# Python code with syntax highlighting
def hello_world():
    print("Hello World!")
    return True
```

```javascript
// JavaScript code
function helloWorld() {
    console.log("Hello World!");
    return true;
}
```

```html
<!-- HTML code -->
<!DOCTYPE html>
<html>
<head>
    <title>Test</title>
</head>
<body>
<h1>Hello World!</h1>
</body>
</html>
```

Indented code block (4 spaces or a tab):

```
def indented():
    return "Code"
```

---

## 8. Blockquotes

> This is a simple quote.

> This is a multiline quote.
> The second line of the quote.
> The third line.

> Nested quotes:
>
> > This is a quote inside a quote.
> >
> > > And even more deeply nested.

> ### Heading inside a quote
>
> Quotes can also include other Markdown elements:
>
> * List items
> * **Bold text**
> * `Code`

---

## 9. Horizontal Rules

Three or more dashes:

---

Three or more asterisks:

---

Three or more underscores:

---

---

## 10. Tables

### Simple Table

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Row 1    | Data     | More     |
| Row 2    | Data     | More     |

### Table with Alignment

| Left | Centered | Right |
|:-----|:--------:|------:|
| Left |  Center  | Right |
| Text |   Text   |  Text |
| 1    |    2     |     3 |

### Table with Formatting

| **Name** | *Age* | `Status`    |
|----------|-------|-------------|
| Max      | 25    | ~~Old~~ New |
| Anna     | 30    | Active      |

---

## 11. Footnotes

Here is a sentence with a footnote[^1].

This is another footnote[^2].

Named footnote[^note].

[^1]: This is the first footnote.

[^2]: This is the second footnote with multiple paragraphs.

    It can contain indented text.

[^note]: Named footnotes are more descriptive.

---

## 12. Definition Lists (extended syntax)

Term 1
: Definition of term 1

Term 2
: First definition of term 2
: Second definition of term 2

---

## 13. Abbreviations (extended syntax)

The HTML specification is maintained by the W3C.

*[HTML]: Hyper Text Markup Language
*[W3C]: World Wide Web Consortium

---

## 14. HTML Embedding

<div style="background-color: #f0f0f0; padding: 10px;">
  <p>Raw HTML code works in Markdown.</p>
  <strong>Bold with HTML</strong>
</div>

<details>
  <summary>Click here for details</summary>

This is hidden content that can be expanded.

* Can also include Markdown
* **With formatting**

</details>

---

## 15. Escape Characters

To display Markdown characters literally, use a backslash:

*Not italic text*

# Not a heading

[Not a link]([http://example.com](http://example.com))

Other characters that can be escaped:
\ ` * _ { } [ ] ( ) # + - . ! |

---

## 16. Mathematical Formulas (extended syntax)

Inline formula: $E = mc^2$

Block formulas:

$$
\int_{a}^{b} f(x) , dx = F(b) - F(a)
$$

$$
\sum_{i=1}^{n} i = \frac{n(n+1)}{2}
$$

---

## 17. Emojis (extended syntax)

:smile: :heart: :thumbsup: :rocket: :star:

---

## 18. Comments

[//]: # "This is a comment and will not be displayed"

[comment]: <> "This is also a comment"

<!--
HTML comments also work
and can be multiline
-->

---

## 19. Combinations

> ### Quote with Code
>
> ```python
> def example():
>     return "Code in quote"
> ```
>
> * List inside quote
    >
    >   * With **formatting**

* And [Links](https://example.com)

| Column | Content                      |
|--------|------------------------------|
| Code   | `print()`                    |
| Link   | [Click](https://example.com) |
| Format | **Bold** and *italic*        |

---

## End of Test File

This is a complete overview of Markdown syntax. Not all features are supported by every Markdown parser (e.g. footnotes,
definition lists, math), but the basic syntax works everywhere.
