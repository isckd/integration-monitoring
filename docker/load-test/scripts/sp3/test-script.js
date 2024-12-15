import http from 'k6/http';
import { sleep, check, group } from 'k6';

// 테스트 설정
export let options = {
  stages: [
    { duration: '10s', target: 20 }, // 10초 동안 가상 사용자를 20명까지 증가
    { duration: '20s', target: 50 }, // 20초 동안 가상 사용자를 50명으로 유지
    { duration: '10s', target: 0 },  // 10초 동안 가상 사용자를 0명으로 감소
  ],
  tags: {                            // 태그 추가
    team : 'server3',
    test_name: 'test-script-2' 
  }, 
  thresholds: {
    http_req_duration: ['p(95)<100'], // 95%의 요청이 100ms 이하이어야 함
  },
};

// setup 함수 - 테스트 실행 전 초기화 작업
export function setup() {
  console.log('Setup: Initializing test setup...');

  // 공통으로 사용할 헤더 초기화
  let headers = {
    'accept': '*/*',
    'Content-Type': 'application/json',
  };

  // 필요한 데이터나 환경 초기화 등 설정
  return {
    initData: 'initial setup data', // 필요 시 데이터를 반환하여 main 함수에 전달
    commonHeaders: headers          // 헤더를 반환하여 main 함수에서 사용
  };
}

// main 함수 - 실제 테스트가 수행되는 부분
export default function (data) {
  let url = 'http://host.docker.internal:8080/api/books';
  let bookId;

  group('POST api/books', function () {
    // __VU: 현재 가상 사용자 ID, __ITER: 해당 VU의 반복 횟수
    let payload = JSON.stringify({
        name: `The Lord of the Rings VU${__VU} ITER${__ITER + 1}`, // VU ID와 반복 횟수를 조합하여 고유한 값으로 변경
        category: 'Fantasy',
        author: {
        name: 'JinUk Ye',
        biography: 'English writer and philologist'
        }
    });

    // POST 요청을 보낸다.
    let res = http.post(url, payload, { headers: data.commonHeaders });

    // POST 요청 응답 검증
    check(res, {
        'is POST status 200 or 201': (r) => r.status === 200 || r.status === 201,   // 상태 코드가 200 또는 201인지 확인
    });

    console.log(`POST Status code: ${res.status}`);

    // POST 응답에서 생성된 ID를 추출한다.
    bookId = res.json().id;
    
  });

  sleep(0.1);       // POST 저장 후 100ms 후에 GET 조회

  // GET 요청 그룹
  group('GET /api/books', function () {
    // 책 ID로 GET 요청을 보낸다.
    if (bookId) {
      let getUrl = `${url}/${bookId}`;
      let getRes = http.get(getUrl, { headers: data.commonHeaders });

      // GET 요청 응답 검증
      check(getRes, {
        'is GET status 200': (r) => r.status === 200, // 상태 코드가 200인지 확인
      });

      console.log(`GET ${getUrl} Status code: ${getRes.status}`);
    } else {
      console.error('No book ID returned from POST request.');
    }
  });

  sleep(0.1);
}

// teardown 함수 - 테스트 종료 후 정리 작업
export function teardown(data) {
  console.log('Teardown: Cleaning up after test...');
  // 테스트가 끝난 후 필요한 정리 작업 수행
}
