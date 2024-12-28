## 24.12.18

# useMemo & useCallback
- 이 둘은 React 라이브러리에서 기본적으로 제공하는 Hook이다.
- 둘 다 메모이제이션 활용하는 도구다. 
- 컴포넌트 리렌더링이 일어나도 값/함수를 다시 생성하지 않게 한다.

- 리액트에서 컴포넌트는 함수이고, 이 함수는 매번 prop이 바뀔 때마다 다시 실행된다.
- 실행되는 과정에서 비싼 연산이 있다면, 굳이 2번 3번 반복할 필요가 없다.
- 따라서 메모이제이션이라고 하는 것은, 일정 조건이 충족되면 미리 캐싱해둔 값을 반환하는 최적화 기법이다.
- 불필요한 재생성을 줄여준다.
- 이 때 의존성 배열이라는 것을 넣을 수 있는데, 이 안에 들어간 값이 바뀌었을 때는 새로 계산을 한다.

```javascript
const memoizedValue = useMemo(() => {
  return computeExpensiveValue(a, b);
}, [a, b]);
```

- useMemo, useCallback 에 대한 좀 더 자세한 내용은 추후 보강.


# 문제 해결

> "addRange(): The given range isn't in document."

- DOM 조작하는 작업을 하려고 하는데, 내가 참조하는 DOM 엘리먼트가 아직 없거나, 삭제되었을 때 발생한다.

- Quill에서 이미지 업로드를 처리하려면 아래 같은 함수를 사용해야 한다.
- 이 함수를 적용하자 문제가 발생했는데, 아래 함수가 컴포넌트에 '생짜'로 들어가 있었기 때문이다.
```javascript
const modules = {
    toolbar: {
        container: [
            ['bold', 'underline', 'strike'],
            ['blockquote'],
            [{ 'header': 1 }, { 'header': 2 }],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            ['link', 'image'],
        ],
        handlers: {
            image: imageHandler,
        },
    }
}
```

- `imageHandler` 안에서는 이미지를 업로드하고, 에디터의 현재 커서가 있는 부분에에 다시 넣어준다.
- 그러기 위해서 아래와 같은 ref를 사용해서 현재 위치의 range를 가져온다.
```javascript 
const range = quillRef.current.getSelection(true)
```

- 그런데 이 range를 생성하는 함수가, 아직 컴포넌트가 렌더링되는 중에 DOM에 접근한다. 
- 그래서 `addRange(): The given range isn't in document.` 라는 에러가 뜨는 것 같다.

- 따라서 해결 방법은, 컴포넌트의 렌더링 주기와 module의 생성 (= range의 생성)을 분리해주는 것이다.
- useMemo, useCallback 등을 사용한다면, 렌더링이 다시 될 때와 상관없이 1번만 값/함수를 생성할 수 있다.
- 렌더링 완료되고 나서 실행되는 것이 보장된다. 
- 따라서 더 이상 에러가 발생하지 않는다.
