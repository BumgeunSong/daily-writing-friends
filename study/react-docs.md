# 리액트 공식 문서 note

## Prop 전달
- spread 를 사용해서 아래로 바로 전달하기
```
 “spread” syntax:

 function Profile({ person, size, isSepia, thickBorder }) {
  return (
    <div className="card">
      <Avatar
        person={person}
        size={size}
        isSepia={isSepia}
        thickBorder={thickBorder}
      />
    </div>
  );
}
```
```
function Profile(props) {
  return (
    <div className="card">
      <Avatar {...props} />
    </div>
  );
}
```

이렇게 직접 전달할 수도 있지만, 대부 분 경우 컴포넌트를 쪼개서 
children을 직접 jsx 로 전달해주는 게 맞다.

## Children
children - parent 컴포넌트.
구멍을 뚫어서 전달해줄 때, prop 대신 children 이라는 파라미터를 쓴다.


## 시간에 따른 변화.
- prop은 시간마다 계속 바뀔 수 있다.
- 하지만 prop은 immutable하다. 컴포넌트 내부에서 prop 받은 값은 바꿀 수 없다.
- 더 상단에서 state로 가지고 있는 컴포넌트만 넘겨줄 수 있다.
- 따라서 prop을 변경하려 하지 말고, state를 변경해야 한다.

## 조건부 렌더링
- 특정 컴포넌트 안에서 null 처리를 하지는 않는다. 컴포넌트 바깥에서 사용하는 쪽에서 예상 못한 동작이 나오기 때문.
- 대부분은 부모 컴포넌트에서, 보여줄지 안 보여줄지를 분기 처리한다.
```
if (isPacked) {
  return <li className="item">{name} ✅</li>;
}
return <li className="item">{name}</li>;
```
- 이렇게 길게 쓰지 않고, 달라지는 부분만 삼항 연산자를 사용해준다.

```
return (
  <li className="item">
    {isPacked ? name + ' ✅' : name}
  </li>
);
```
- 하지만 너무 많은 조건부 마크업이 되면 코드가 지저분해질 수 있다.
- 자식 컴포넌트로 분리하는 게 좋다.

- && operator를 쓰기도 한다.
- && 오퍼레이터는 왼쪽에 있는 값이 true 일때 오른쪽에 있는 값을 리턴한다.
- 만약 왼쪽 값이 false이면 그냥 false를 리턴하는데,
- 리액트에서는 null 이나, undefined, false 같은 것을 jsx tree안에서 보게 되면 empty 취급을해서 아무것도 렌더링하지 않는다.
- 특정한 변수가 true일 때만 렌더링을 할 수 있다.
```
return (
  <li className="item">
    {name} {isPacked && '✅'}
  </li>
);
```

## 리액트에서 list를 렌더링할 때
- map, filter를 쓸 때는 id를 꼭 key로 넣어줘야 한다.
- 배열 안의 아이템이 추가, 삭제, 움직일 수 있기 때문이다.
- key를 가지고 식별을 해서 어디가 어떻게 움직였는지 알아낼 수 있어야,
- 모든 부분을 다 업데이트하지 않고, DOM 트리에서 변경된 부분만 삽입/삭제를 할 수 있다.

## 리액트에서 모든 컴포넌트는 pure 해야한다.
- 즉 외부에서 들어온 값을 변경하거나,
- 외부에 암시적인 참조를 하면 안 된다.
- 만약 prop이 같으면 반드시 같은 jsx를 return 해야 한다.
- 하지만 prop이 아니라, local에서 생성한 변수를 mutation하는 것은 괜찮다.
- pure function은 외부에서 가져온 variable을 변경시키면 안되지만, 내부에서 복사한 변수나 local 변수를 바꾸는 것은 아무 상관이 없음.
  
## 이벤트 핸들러 != pure
- pure한 함수들은 어느 순간에는 side effect를 일으켜야 한다.
- 이런 side effect는 렌더링이 아니라, 별개의 트랙으로 이뤄진다.
- 리액트에서 사이드 이펙트가 일어나는 순간은 대부분 이벤트 핸들러다.
- 이벤트 핸들러는 사이클과는 관련없이 일어나는 로직이다.
- 이벤트 핸들러가 컴포넌트 안에 '정의'되어있지만, 렌더링 때 '실행'되는 것은 아니다.
- 따라서 이벤트 핸들러는 pure할 필요가 없다.

## pure하면 좋은 점
   - 인풋값이 바뀌지 않으면, 아웃풋값을 굳이 다시 계산할 필요가 없다.
      - 어차피 동일한 결과가 나오는 것이 보장된다.
      - 따라서 계산을 다시 할 필요없이 스킬할 수 있다.
      - Caching을 해도 안 전하다.
   - 컴포넌트 트리를 렌더링하다가 중간에 데이터가 바뀌게 되면, 렌더링을 멈추고 다시 시작할 수 있다.
   - 계산을 중간에 멈추더라도, 순서에 의존하지 않기 때문에 다시 실행하면 똑같은 결과가 나오는 것을 보장할 수 있다.
   - 렌더링 이전의 객체나 변수에 신경쓸 필요가 없고, 같은 값을 넣으면 같은 아웃풋이 나온다는 거.

##  UI는 tree다.
- 리액트에서 UI는 컴포넌트의 트리다.
- 리액트는 컴포넌트 코드를 render tree로 바꾼다. 각 컴포넌트는 tree의 node가 된다.
- 이 렌더 트리는 상위 컴포넌트와 하위 컴포넌트를 만들고, 상위 컴포넌트는 하위 컴포넌트의 렌더링에 영향을 미치고, 하위 컴포넌트는 상위 컴포넌트보다 훨씬 더 자주 렌더링된다.
- 이걸 이해하면 리액트 퍼포먼스의 많은 부분을 알 수 있다.

## 의존성도 tree다.
- 각 모듈의 의존성을 tree로 만들어서, 필요한 코드만 번들링 한다.


