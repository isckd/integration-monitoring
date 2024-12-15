위 기술에 대해 검색해보면 개인 서버에 실행하는 것이 대부분이고, 이유와 과정에 대해 자세한 설명이 없어 따로 블로그를 작성한다.
조직에서, 특히 폐쇄망에서 사내 구성원들이 하나의 환경에서 사용할 수 있게 하고, 커스텀한 시각화 DashBoard 구축을 목표로 진행한다.
또한 이 문서를 보는 사람들이 각자 자신만의 metric 시각화를 구축할 수 있게 자세하게 설명하고자 한다.

<br>
<br>

---

<br>
<br>

## 도입 이유

사내 Spring Boot 기반의 MSA 아키텍처로 구성된 개발 환경에서는, 그동안 부하 테스트 및 모니터링에 적합한 도구를 제대로 사용하고 있는지는 의문이었다.
운영계에는 Jeniffer 와 MaxGuage 솔루션을 도입해 실시간으로 장애상황 모니터링이 가능했지만, 개발계에선 여러가지 부하테스트를 수행하고 병목지점을 발견하기 위한 모니터링은 전무한 상황이었다.

그래서 개발자들은 필요 시 각자 로컬 환경에서 JMeter를 사용하여 부하 테스트를 진행했지만, JMeter는 OS 단에서 관리하는 스레드를 사용하기 때문에 스레드 하나 당 메모리 1MB 이상을 소비하며 컨텍스트 스위칭 비용도 무시할 수 없기 때문에 과연 많은 양의 부하를 줄 수 있었는가에 대해서는 개인적으로 의구심이 있었다.

결론적으로 부하 테스트 환경의 확장성과 효율성에 제한이 있었고, 내가 개별적으로 구축한 Ngrinder 역시 비슷한 문제를 가지고 있었다.
각 인스턴스들의 모니터링은 당연히 적용되지 않은 상태였다.

이에 따라 보다 중앙화해 관리할 수 있고, 정형화되고 효율적인 부하 테스트 및 모니터링 도구를 도입하기로 결정했다.

<br>

여기서 개발계와 운영계는 인프라 구조부터가 다른데, 이렇게까지 할 필요가 없다는 의견이 있을 수 있다.
물론 Spring Boot 인스턴스 수와, 각 툴들의 클러스터링 구조 및 서버 사양도 모두 다른 상황인 것은 맞다. 
하지만 나는 개발계에서도 부하테스트와 모니터링이 필수적이라 생각하는 이유는 아래와 같다.
- 꼭 성능만을 측정하고자 하는 것이 아니다.
- 트래픽 양에 따른 스토리지 및 메모리 소비량을 확인할 수 있다.
- 부하 임계점을 찾고 운영환경과 비례해 간략하게나마 비교할 수 있다.
- 부하 발생 시 예상치 못한 이슈 발견 및 재현을 할 수 있다. 이로 인해 빠르게 부하를 재현하고 수정이 가능하다.
- 어느 작업이 전체 작업 중 리소스를 몇% 나 차지하는지, 어느 부분에서 병목현상이 발생하는지 확인이 가능하다.

<br>
<br>

---

## 사용한 부하테스트 / 모니터링 툴

모니터링이라고 함은 기본적으로 `시계열 데이터` 를 기반으로 시각화 하는 것을 기반으로 한다.
시계열 데이터라고 함은 어려울 것 없이 특정 시간대별로 데이터의 양상을 나타낸다고 이해하면 된다.

모니터링을 위해선 시계열 데이터는 내가 원하는 인스턴스의 정보들을 나타내는 Metric 들이어야 하며, 이 진영에서는 Prometheus 가 오픈소스로 꽉 잡고있다.

Prometheus 동작 방식은 외부 인스턴스에서 제공하는 /prometheus API Endpoint 를 Polling 하여 저장하는 방식이고, 웬만한 오픈소스 툴, 프레임워크들은 해당 API Endpoint 를 제공한다.
즉, 데이터 수집 주체는 Prometheus 이고 Grafana 에서는 Prometheus 에 특정 시간대의 특정 인스턴스의 데이터를 요청하는 구조이다.

그래서, 부하를 받는 Spring Boot 인스턴스 및 여러가지 툴, 프레임워크들의 성능을 모니터링하기 위해 Prometheus를 적용하였다.

그리고 K6 부하테스트의 실시간 진행상황 및 결과를 InfluxDB 에 저장하고, Grafana와 연동하여 시각화했다.

InfluxDB 는 API Endpoint 로 제공하지 못하는 정보들을 외부에서 직접 저장하는 것이 가능해, K6 부하테스트의 진행상황 및 결과를 수집하였다.
즉, 데이터 수집 주체는 외부 인스턴스(K6) 이고 InfluxDB 는 데이터를 저장하고 Grafana 에 데이터를 제공하는 것이다.

결과적으로, K6, Grafana, Prometheus, InfluxDB를 조합하여 부하 테스트와 모니터링의 통합된 환경을 구축할 수 있었다.

이외 Oracle, MySQL, Redis, RabbitMQ, Elasticsearch, Kafka 등을 모니터링 할 수 있게 exporter 를 사용해 Prometheus 로 metric 을 수집하고 Grafana 에서 시각화 할 수 있는 과정도 진행했다. 

설치는 최대한 Docker 를 사용해 일관적인 관리와 재사용성을 높였다.

이를 통해 Spring Boot 기반의 MSA 아키텍처에 대한 신뢰성을 높이고, 성능 최적화를 위한 기반을 마련해보자.

<br>

### Prometheus

Prometheus 는 시계열DB 를 제공하며, 모니터링 및 경고 알림 시스템에 특화되어있다.
여기서는 운영이 아닌 개발환경이라 알림 기능은 제외했지만, 기본적인 Metric 을 수집하는 기능으로서는 다른 툴들과의 호환성이 매우 뛰어나다.

특징은 아래와 같다.
- 데이터 장기 저장보다는 현재 시점으로부터 특정 기간 전까지의 시계열 데이터를 수집하는 것에 특화되어있다. 기본값으로는 일주일동안 저장한다.
- Metric 들을 키-값 형태의 Label 으로 정의해 시계열 데이터로 저장한다.
- PromQL 언어를 사용한다.
- `Pull` 방식을 사용해 외부에서 Prometheus 에 Metric 정보들을 보내는 형식이 아닌, Prometheus 자체적으로 특정 인스턴스에 API 를 Polling 형식으로 호출해 가져오는 방식이다.
- 워낙 오래되고 활성 사용자가 많은 만큼, Grafana Dashboard 들을 보면 대부분이 Prometheus 에서 metric 을 가져와 시각화 하는 방식이 많다.
- Prometheus 에서 외부 인스턴스의 데이터를 가져올 때, 해당 인스턴스는 아래와 같은 데이터 형식으로 API 응답을 주어야 한다. 
```
# HELP cpu_usage CPU usage in percentage
# TYPE cpu_usage gauge
cpu_usage{job="app-server", instance="10.0.0.1"} 85.7
cpu_usage{job="app-server", instance="10.0.0.2"} 65.3
```

외부 인스턴스에서 위와 같이 API 응답을 위 형태 그대로 응답해야 Prometheus 에서 정상적으로 Polling 할 수 있다.
Json 방식이 아님에도 불구하고, Prometheus 는 워낙 활성화된 오픈소스라 다양한 도구들에서 Prometheus 전용 API Endpoint 들을 제공해, 이것이 가장 장점이라고 판단했다.

그래서 K6 부하테스트 모니터링을 제외하고는 전부 Prometheus 로 metric 을 수집했다.

<br>

### InfluxDB

InfluxDB 도 시계열DB 로서의 역할을 제공하지만, Prometheus 와는 다르게 DB 로서의 역할에 치중해있다.

특징은 아래와 같다.
- 시계열 데이터 분석 및 장기 저장에 특화되어있다.
- `Pull 방식 뿐 아니라 Push 방식도 지원` 해 외부 인스턴스에서 시계열 데이터를 삽입하는 Push 도 가능하다.
- 1.x 버전에서는 InfluxQL 언어를 사용했으나, 2.x 부터는 WEB UI 지원 및 Flux 언어를 사용한다.
- 자체적인 알림 기능이 존재하지 않는다.

<br>

### K6

Go 언어의 코루틴(고루틴) 기반으로 동작하여 메모리 효율이 뛰어난 (Java 의 일반 Thread 에 비해 10배 가까이 메모리 효율이 좋은) K6를 부하 테스트 도구로 적용하였다. <br>
특히 일반적인 쓰레드는 OS 에 종속되며 메모리 사용량이 크며, 컨텍스트 스위칭이 발생할 때마다 OS Level 에서 System Call 이 발생해 많은 양의 리소스가 소비된다.
코루틴은 경량화된 쓰레드 개념으로, OS 에 의해 직접 관리되지 않고 일반 쓰레드와 M:N 매핑해 사용된다.
컨텍스트 스위칭 비용이 적고, 낮은 메모리 사용량 덕분에 JMeter 와 같은 일반 쓰레드로 동작하는 도구에 비해 K6 는 훨씬 많은 VUser (가상 사용자 수) 를 사용 가능하다.
K6는 이러한 경량화된 구조 덕분에 높은 부하를 생성하면서도 시스템 자원 사용을 최소화할 수 있었다.
K6 vs JMeter 부하테스트 도구 비교 : 
- [K6 vs JMeter (Grafana Blog)](https://grafana.com/blog/2021/01/27/k6-vs-jmeter-comparison/)

또한 K6 는 부하를 주기 위해 일회성으로 동작하므로, metric 수집을 위해 정기적으로 API 를 Polling 하는 (Pull 방식) Prometheus 와는 방향성이 맞지 않는다.

그래서 Push 방식의 시계열 데이터를 지원하는 InfluxDB 와 연동하였다.

<br>

### Grafana

여러 도구를 사용하는 환경에서도 중앙 집중식 대시보드를 제공하며, 활성화된 오픈소스 커뮤니티로 웬만한 툴들의 metric 들을 시각화하는 Dashboard 들이 많이 존재한다.
특히 Grafana 재단에서 K6 를 만든만큼 K6 모니터링 호환성이 뛰어나다.
또한 Prometheus 재단과는 독립되었지만, 서로 활성화된 오픈소스인 만큼 상호 보완이 잘 되어 호환성이 뛰어나다.

<br>

### 다양한 exporter

Oracle, MySQL, Redis, Kafka, Elasticsearch, RabbitMQ 자체를 모니터링 할 수있는 방법은 무엇이 있는지 생각해보자.

우선 위 툴들에서 자체적으로 제공하는 모니터링 툴들이 존재하는 경우도 있지만, 지금 우리는 Grafana 라는 통합 모니터링 환경에서 구축하는 것이 목표이므로 조금은 다르게 접근해보자.

그러면 두 가지의 방식이 존재한다.

1. Grafana Datasource 에 직접 연동하는 방법
이 방법은 각 인스턴스들이 Grafana 와 호환이 되는지부터 검토해야 한다.
Redis, Elasticsearch, RabbitMQ 등이 가능하지만 여러가지 고려사항이 존재한다.
	- 제공하는 Metric 들의 양과 질이 모니터링하기에 적합한가
	- Grafana 버전과 호환되는가 (Elasticsearch 의 경우엔 버전 제약이 강하다)
2. 각 인스턴스들의 metric 정보들을 Prometheus 으로 수집해 Grafana 에서 시각화
이 방법은 Prometheus 에 metric 을 전달하기 위한 exporter 라는 인스턴스를 별개로 띄워야 한다.
이 exporter 들은 각 인스턴스들이 prometheus 와 호환이 되지 않더라도, 개인이 직접 커스텀한 exporter 로 인스턴스들의 metric 정보를 수집해 prometheus 와 호환이 되게 만들어 주는 녀석들이다. 

여러가지 종류의 인스턴스 종류들을 모니터링하기 위해서 1번과 2번의 방식이 혼합되어 사용되지만 이번의 경우엔 RabbitMQ 만 1번 방식을 사용하고 나머지는 2번 방식을 
채택했다. 
그 이유에 대해서는 exporter 환경을 구성할 때 설명한다.


<br>
<br>

---

<br>
<br>

## 구성도

<br>

### 기본 구성도 

![](https://velog.velcdn.com/images/mud_cookie/post/5dd7fe1a-658f-433c-acca-c82549b45ca6/image.png)

<br>

1. Spring Boot 인스턴스들의 실시간 메트릭 정보들을 요청하고 저장하기 위해 Prometheus 를 도입했다. 각 Spring Boot 인스턴스들은 /actuator/prometheus 엔드포인트를 활성화해야 하고, Prometheus 에서 어느 인스턴스를 몇초마다 Polling 할 건지 지정할 수 있다.

2. Grafana 에서 Spring Boot 인스턴트들을 시각화할 DashBoard 를 만들고, Prometheus 를 Polling 하여 시계열 메트릭 정보를 시각화한다.

3. K6 부하테스트를 진행하고, 각 진행상황 및 결과들을 InfluxDB 에 저장(Push)한다.

4. Grafana 에서 부하테스트 결과들을 시각화할 DashBoard 를 만들고, K6 에서 진행한 부하테스트 시계열 데이터를 Polling 하여 시각화한다.

<br>

### 추가 Tool Exporter 구성도

![](https://velog.velcdn.com/images/mud_cookie/post/42ad75c6-4e04-4cd4-b9bd-610e927c3884/image.png)


<br>

1. Oracle, Redis, Kafka, MySQL, Elasticsearch 는 각각 exporter 를 띄워 각각의 metric 을 수집 후 Prometheus 에서 재수집하고, Grafana 에서 Prometheus 를 Polling 해 시각화한다.
RabbitMQ 의 경우엔 exporter 필요 없이 자체 플러그인으로 Prometheus 에서 metric 수집하도록 구성한다.

<br>

결론적으로 부하테스트 진행 시 SpringBoot Instance 와 K6 부하테스트 Dashboard 두 개를 확인하고, 이외 추가로 사용한 툴이 있다면 해당 exporter 에 맞는 Dashboard 를 같이 확인하면서 진행할 수 있다.

<br>
<br>

---

<br>
<br>


## 구성 특이사항

아래 소개할 설치과정에서 조직 공통으로 사용하기 위해 설정한 특이사항들을 소개한다.

- 2024/12 기준 최신 버전인 
	prometheus:v3.0.1
    grafana:11.3.1
 을 기준으로 진행하고, InfluxDB 는 2.x 버전에서 아직 K6 와의 호환성이 떨어지므로 1.x 버전 중 최신인 1.11.8 으로 진행한다. 대신 InfluxDB 1.x 버전은 웹 UI 를 지원하지 않는다.
- docker-compose 로 prometheus, grafana, influxDB 를 하나로 관리한다.
- K6 는 각 로컬 환경에서 실행하는 것이 일반적이나, 테스트 스크립트 중앙화 및 조직 내 편의성을 위해 폐쇄망에서 Docker 로 설치한다.
로컬 PC 의 하드웨어 성능 제약을 벗어나려는 의도도 존재한다.
다만 Docker K6 는 컨테이너를 일회성으로 띄우는 방식이므로, 위 docker-compose 로 같이 관리하지 않고 docker run 명령어로 실행시킬 수 있게 한다.
물론 동시에 여러개의 컨테이너를 띄워 부하테스트를 수행하는 것도 가능하다.
- 각 Spring Boot 인스턴스들의 데이터를 바로 Influx DB 에 저장하지 않은 이유는
운영환경에서는 이미 Jennifer 모니터링 도구를 사용하고 있기 때문이다.
개발 환경에서 InfluxDB 에 데이터를 저장하는 request 를 보내는 코드가 운영환경에서 돌지 않기를 원했고, 결론적으로 Spring Boot Instance 들은 actuator endpoint 만 제공하고 Prometheus 에서 해당 API 를 Polling 하는 방식을 채택해 운영환경에서 불필요한 오버헤드가 발생하지 않게 설정했다.
- 다수의 구성원들이 작성한 테스트 결과들이 중첩되는 것을 방지하기 위해, Grafana 에서 K6 모니터링 Dashboard 를 조금 커스텀했다.
- 각 exporter 들과 Dashboard 들은 종류가 많아 사내 환경에 적합한 것을 임의적으로 선택했다.

<br>
<br>

---

<br>
<br>

## 설치 과정

### 1. Spring Boot 에 Prometheus 메트릭 수집 활성화

```
# build.gradle.kts

dependencies {
    implementation("io.micrometer:micrometer-registry-prometheus")
}

# actuator 의 prometheus endpoint 노출하도록 해야 한다.
# 여기서는 /actuator 의 전체 endpoint 를 노출하게 했지만, 각자 필요에 맞게 설정한다.
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: "*"
```

아래는 Postman 으로 /actuator/prometheus 을 호출한 예시이다.
json 형태가 아니라 일반 text 로 보냄에 참고하자.

![](https://velog.velcdn.com/images/mud_cookie/post/34565d44-b682-4cdf-827e-65dc6c442e36/image.png)

아래 정보들이 포함됐음을 확인 가능하다.
> 기본적으로는 아래 내용을 포함하지만, rabbitmq 나 redis 와 같은 외부 도구를 사용할 경우 추가 metric 이 노출되는 것이 확인된다. 각자 Spring Boot 에서 /actuator/prometheus API 를 호출해보자.

1. 애플리케이션 상태
- `application_ready_time_seconds`: 애플리케이션이 요청을 처리할 준비가 되기까지 걸린 시간.
- `application_started_time_seconds`: 애플리케이션이 시작되기까지 걸린 시간.

2. 디스크 사용량
- `disk_free_bytes`: 사용 가능한 디스크 공간 (바이트).
- `disk_total_bytes`: 전체 디스크 용량 (바이트).

3. 쓰레드 풀 관련 메트릭 (Executor)
- `executor_active_threads`: 현재 활성 상태인 쓰레드 개수.
- `executor_completed_tasks_total`: 완료된 작업의 총 개수.
- `executor_pool_core_threads`: 풀의 핵심 쓰레드 수.
- `executor_pool_max_threads`: 풀의 최대 쓰레드 수.
- `executor_pool_size_threads`: 현재 풀의 쓰레드 수.
- `executor_queue_remaining_tasks`: 큐에서 수용 가능한 작업의 남은 공간.
- `executor_queued_tasks`: 큐에 대기 중인 작업 수.

4. HikariCP (JDBC Connection Pool)
- `hikaricp_connections`: 전체 커넥션 수.
- `hikaricp_connections_acquire_seconds`: 커넥션 획득 시간 통계.
- `hikaricp_connections_active`: 활성 상태 커넥션 수.
- `hikaricp_connections_idle`: 유휴 상태 커넥션 수.
- `hikaricp_connections_max`: 최대 커넥션 수.
- `hikaricp_connections_min`: 최소 커넥션 수.
- `hikaricp_connections_pending`: 대기 중인 스레드 수.
- `hikaricp_connections_timeout_total`: 타임아웃 발생 횟수.
- `hikaricp_connections_usage_seconds`: 커넥션 사용 시간 통계.

5. HTTP 요청 메트릭
- `http_server_requests_seconds`: HTTP 요청 처리 시간 통계.
- `http_server_requests_active_seconds`: 활성 요청 처리 시간 통계.
- `http_server_requests_seconds_max`: 요청 처리 시간의 최대값.

6. JDBC 커넥션 메트릭
- `jdbc_connections_active`: 활성 JDBC 커넥션 수.
- `jdbc_connections_idle`: 유휴 JDBC 커넥션 수.
- `jdbc_connections_max`: 최대 JDBC 커넥션 수.
- `jdbc_connections_min`: 최소 JDBC 커넥션 수.

7. JVM 메모리 메트릭
- `jvm_memory_committed_bytes`: JVM이 커밋한 메모리.
- `jvm_memory_max_bytes`: JVM이 사용할 수 있는 최대 메모리.
- `jvm_memory_used_bytes`: JVM이 사용 중인 메모리.
- `jvm_memory_usage_after_gc`: GC 이후 사용 중인 메모리 비율.

8. JVM 쓰레드 메트릭
- `jvm_threads_live_threads`: 현재 활성 쓰레드 수.
- `jvm_threads_daemon_threads`: 현재 활성 데몬 쓰레드 수.
- `jvm_threads_peak_threads`: JVM 시작 이후 최고 쓰레드 수.
- `jvm_threads_states_threads`: 각 상태별 쓰레드 수 (Runnable, Waiting 등).

9. JVM 클래스 로딩 메트릭
- `jvm_classes_loaded_classes`: 현재 JVM에 로드된 클래스 수.
- `jvm_classes_unloaded_classes_total`: JVM 시작 이후 언로드된 클래스 수.

10. JVM GC (Garbage Collection) 메트릭
- `jvm_gc_pause_seconds`: GC로 인한 일시 중단 시간 통계.
- `jvm_gc_memory_promoted_bytes_total`: 힙의 old generation으로 승격된 메모리 총량.
- `jvm_gc_memory_allocated_bytes_total`: GC 후 힙에 할당된 메모리 총량.

11. JVM CPU 및 프로세스 메트릭
- `process_cpu_usage`: JVM 프로세스의 CPU 사용량.
- `process_cpu_time_ns_total`: JVM 프로세스의 CPU 사용 시간 (나노초).
- `process_start_time_seconds`: JVM 프로세스 시작 시간.
- `process_uptime_seconds`: JVM 프로세스 실행 시간.

12. 시스템 메트릭
- `system_cpu_count`: CPU 코어 수.
- `system_cpu_usage`: 시스템 CPU 사용률.

13. 로깅 메트릭
- `logback_events_total`: 로그 레벨별 발생 이벤트 수.

14. Tomcat 세션 메트릭
- `tomcat_sessions_active_current_sessions`: 현재 활성 세션 수.
- `tomcat_sessions_active_max_sessions`: 최대 활성 세션 수.
- `tomcat_sessions_created_sessions_total`: 생성된 세션 총 수.
- `tomcat_sessions_expired_sessions_total`: 만료된 세션 총 수.
- `tomcat_sessions_rejected_sessions_total`: 거부된 세션 총 수.

15. JVM 정보
- `jvm_info`: JVM의 버전 및 런타임 정보.

<br>
<br>



### 2. Prometheus, Grafana, InfluxDB 설치 및 설정

사내 조직은 폐쇄망이라, Windows docker 에서 이미지를 받은 후, tar 파일로 변환 후 폐쇄망으로 이관해 다시 이미지로 변환하는 과정을 거친다.

폐쇄망에서 바로 이미지를 pull 받을 수 있는 경우에는 그럴 필요가 없으니 
바로 docker-compose.yml 파일로 이동하면 된다.

준비 환경
- Local PC : Windows, WSL2, Docker
- 폐쇄망 : Linux, Docker


#### 2-1. Local PC

```
# docker image download

docker pull prom/prometheus:v3.0.1
docker pull grafana/grafana:11.3.1
docker pull influxdb:1.11.8

# docker image to tar
docker save -o prometheus.tar prom/prometheus:v3.0.1
docker save -o grafana.tar grafana/grafana:11.3.1
docker save -o influxdb.tar influxdb:1.11.8

cd ;
explorer.exe .
# 이후 열린 WSL 파일 탐색기에서 Window 로 파일 이관 → 폐쇄망으로 이관한다. 또는 바로 SFTP 로 파일 업로드를 해도 된다.
```

<br>


#### 2-2. 폐쇄망

.tar 파일이 이관됐으면 이제부터는 폐쇄망에서 작업한다.

```
# 폐쇄망에서 아래 명령어로 tar 파일을 docker image 로 변환한다. .tar 파일을 저장한 위치를 지정해야 한다.

docker load -i /path/to/target/prometheus.tar
docker load -i /path/to/target/grafana.tar
docker load -i /path/to/target/influxdb.tar

# image 변환 확인
docker images
```

<br>

#### 2-3. docker-compose.yml

관리 편의성을 위해서 ${docker 외부에서 마운트할 디렉토리} 는 모니터링 관련 디렉토리를 따로 만들어서 마운트하자.


```
version: '3.7'

services:
  prometheus:
    image: prom/prometheus:v3.0.1
    container_name: prometheus
    ports:
      - "9090:9090" # Prometheus 웹 UI
    volumes:
      -  ${docker 외부에서 마운트할 디렉토리}/prometheus.yml:/etc/prometheus/prometheus.yml
    networks:
      - monitoring_network	# 모니터링 전용 network 이름을 지정
    restart: always

  grafana:
    image: grafana/grafana:11.3.1
    container_name: grafana
    ports:
      - "3000:3000" # Grafana 웹 UI
    environment:
      - GF_SECURITY_ADMIN_USER=admin # Grafana 기본 사용자
      - GF_SECURITY_ADMIN_PASSWORD=admin # Grafana 기본 비밀번호
    volumes:
      - grafana-data:/var/lib/grafana
      - ${docker 외부에서 마운트할 디렉토리}/provisioning:/etc/grafana/provisioning # 프로비저닝 디렉토리
    depends_on:
      - prometheus
      - influxdb
    networks:
      - monitoring_network	# 모니터링 전용 network 이름을 지정
    restart: always

  influxdb:
    image: influxdb:1.11.8	# influxdb 2.x 버전은 k6 와 호환성이 떨어져 1.x 버전 중 최신으로 진행
    container_name: influxdb
    ports:
      - "8086:8086" # InfluxDB API
    environment:
      - INFLUXDB_DB=metrics # 기본 데이터베이스 이름
      - INFLUXDB_ADMIN_USER=admin
      - INFLUXDB_ADMIN_PASSWORD=admin
      - INFLUXDB_HTTP_AUTH_ENABLED=false	# Grafana DashBoard 에서 바로 접근 가능하도록 HTTP Auth 인증을 false 로 지정
    volumes:
      - influxdb-data:/var/lib/influxdb
    networks:
      - monitoring_network	# 모니터링 전용 network 이름을 지정
    restart: always

volumes:
  grafana-data:
  influxdb-data:

networks:				# 모니터링 전용 network 이름을 지정
  monitoring_network:
    driver: bridge
    name: monitoring_network
```

<br>

#### 2-4. ${docker 외부에서 마운트할 디렉토리}/prometheus.yml 파일 작성

아래 scrape_configs 내부에 Spring Boot 인스턴스 별로 job 을 추가하자.
prometheus 자체 메트릭은 기본값으로 추가해두자.

```
# prometheus.yml
global:
  scrape_interval: 5s # 메트릭 수집 주기

scrape_configs:
  - job_name: 'test'
    metrics_path: '/actuator/prometheus'
    static_configs:
      - targets: ['localhost:8080']  # 

  - job_name: 'prometheus'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['localhost:9090'] # Prometheus 자체 메트릭
```

<br>

#### 2-5. ${docker 외부에서 마운트할 디렉토리}/provisioning/datasources/datasource.yml 파일 작성


```
# datasource.yml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090 # Prometheus 컨테이너 이름 사용
    isDefault: true

  - name: InfluxDB
    type: influxdb
    access: proxy
    url: http://influxdb:8086 # InfluxDB 컨테이너 이름 사용
    database: metrics
    user: admin
    password: admin
    jsonData:
      httpMode: POST   
```

```
docker compose up -d	# docker-compose.yml 이 존재하는 위치에서 실행
docker ps -a	# Grafana, Prometheus, InfluxDB 컨테이너 기동 확인
```

<br>
<br>

### 3. Spring Boot Grafana DashBoard 적용

Grafana, Prometheus, InfluxDB 컨테이너들이 모두 기동이 완료되었다면, Grafana 에서 DashBoard 로 시각화해보자.

우선 Prometheus 에 metric 정보들이 잘 수집이 되는지 확인한다.
http://폐쇄망Host:3000/targets 으로 Prometheus 웹 UI 에 진입하자.

![](https://velog.velcdn.com/images/mud_cookie/post/9cac647f-5592-477b-a994-0bf060ffcb5d/image.png)

기본 prometheus metric 과, 별도로 Spring Boot 를 모니터링하기 위한 test job 이 5초 주기로 잘 수집되는 것을 확인할 수 있다.

이후 Grafana 에 접속한다.
초기 username/pw 는 docker-compose.yml 에 설정했던 값으로 진행한다. (admin/admin)

![](https://velog.velcdn.com/images/mud_cookie/post/8d6bfcfa-2620-4d4b-ae75-eb2e12862d74/image.png)

이후 pw 변경까지 완료하면 아래와 같은 좌측 사이드 탭이 뜬다.
먼저 `Data sources` 탭에서 Promethues 와 InfluxDB 와의 Connection 이 잘 되는지 확인한다.

![](https://velog.velcdn.com/images/mud_cookie/post/be5f8346-085a-40a5-86cc-39f5e4046b1b/image.png)

![](https://velog.velcdn.com/images/mud_cookie/post/ba802856-1c4a-4b10-a551-9d5348988ff9/image.png)

이후 DashBoards 탭으로 진입해 시각화 템플릿을 import 하자.

![](https://velog.velcdn.com/images/mud_cookie/post/551bba55-3898-4810-aaa0-273f1f599bf0/image.png)

![](https://velog.velcdn.com/images/mud_cookie/post/8fa4b725-d2bf-47da-b9ac-0ab3bdcffe21/image.png)

여기서 DashBoard Id 나 Json 은 https://grafana.com/grafana/dashboards/
에서 검색해서 가져온다.
Grafana 의 장점이 사용자가 많다보니 이런 오픈소스 템플릿이 잘 구비되어있다는 점이다.

사내에서는 Spring Boot 2.1 버전이 가장 많이 쓰이고 있으므로, 
https://grafana.com/grafana/dashboards/11378-justai-system-monitor/
위 Grafana Labs solution 에서 직접 제공하는 Spring Boot 2.1 버전용 DashBoard template 을 사용한다.

![](https://velog.velcdn.com/images/mud_cookie/post/c79bb579-1903-49d0-a163-65ff9e227f1d/image.png)

외부망과 연결이 되는 상태라면 Copy ID 로 설치한 Grafana 에서 ID 만 넣으면 되고, 연결이 되지 않는 상태라면 .json 을 다운받아 코드를 복사해 붙여넣고 Load 하면 된다.

이후 아래 화면에서 연결할 data source 를 prometheus 로 지정하고 Import 한다.

![](https://velog.velcdn.com/images/mud_cookie/post/dff8e07b-bbfd-45b2-b2e5-0a922c3899f2/image.png)

그러면 아래와 같이 시각화되는 모습을 볼 수 있다.
Instance 탭에는 prometheus.yml 파일에서 지정했던 targets 을 선택해서 원하는 Spring Boot 인스턴스의 메트릭 정보를 확인하면 된다.

![](https://velog.velcdn.com/images/mud_cookie/post/202a3c59-825f-48dc-bcdf-59db741e4860/image.png)


<br>
<br>


### 4. K6 부하테스트 설치 및 Grafana DashBoard 적용

앞서 언급했다시피, Docker K6 는 일회성으로 컨테이너가 생성되다보니, docker-compose.yml 로 통합시키지 않고 Docker run 으로 실행시키고자 한다.

폐쇠망의 경우, 역시 위 Windows 에서 진행했던 것과 같이 image 를 pull 하고 tar 파일로 변환해 폐쇄망으로 이관 후 다시 image 로 변환하는 과정을 거치자.

#### 4.1 k6 image pull 후 변환 해 이관, 역변환

```
docker pull grafana/k6:0.55.0
docker save -o k6.tar grafana/k6:0.55.0

cd ;
explorer.exe .

# 이후 아까와 같이 .tar 파일을 폐쇄망으로 이관한다.
# load 시 .tar 파일을 저장한 위치를 지정해야 한다.

docker load -i /path/to/target/k6.tar
docker images  #설치 확인
```


#### 4.2 `${docker 외부에서 마운트할 디렉토리}/load-test/${팀명}/test-script.js` 작성

기본적으로 k6 테스트 스크립트는 Javascript 로 작성한다. 
(Javascript Interpreter 를 통해 런타임에서는 Go 엔진으로 동작한다.)
크게 어려울 것은 없고 자세한 스크립트 작성법은 
[K6 부하테스트 스크립트 작성법](https://velog.io/@mud_cookie/K6-%EB%B6%80%ED%95%98%ED%85%8C%EC%8A%A4%ED%8A%B8-%EC%8A%A4%ED%81%AC%EB%A6%BD%ED%8A%B8-%EC%9E%91%EC%84%B1%EB%B2%95)
에서 설명한다.

```
// #test-Script.js
import http from 'k6/http';
import { sleep } from 'k6';

export let options = {
	// InfluxDB 저장 시에 이러한 테스트 스크립트로 실행되었다 라는 것을 명시하기 위해 작성한 커스텀 필드를 작성한다.
    // Grafana 에서 시각화 시 여러 개가 중첩되어 보이는 것을 방지하기 위함이고, DashBoard 역시 커스텀해야 한다. 
    // 이 커스텀 필드는 K6 Grafana DashBoard 에서 추가로 설명한다.
    tags: { test_name: "test-script-1" }, // 태그 추가
};

export default function () {
	// 테스트할 API 를 지정하고, group 명을 지정한다.
    // 만약 Linux 에서 Spring Boot 인스턴스가 docker 외부의 localhost 에 존재한다면, localhost -> 172.17.0.1 으로 대체한다.
    // Windows 또는 Mac 환경이라면 host.docker.internal 로 대체.
    group('POST /test', function () {
    	const res = http.get('http://localhost:8080/test');
    	sleep(1);    
    }
}
```

<br>

#### 4.3 K6 test-script.js 실행

이제 K6 스크립트를 Docker 로 실행해보자.

```
docker run --rm --network monitoring_network \
  -v ${docker 외부에서 마운트할 디렉토리}/load-test/:/scripts grafana/k6:0.55.0 run \
  --out influxdb=http://influxdb:8086/metrics \
  /scripts/${팀명}/test-script.js
```

명령어를 하나하나 살펴보면 이렇다.
- --rm : K6 컨테이너는 일회성이라 실행이 끝나면 컨테이너가 자동으로 종료되지만, 삭제되지는 않아 디스크 남용을 방지하기 위해 삭제를 명시한다.\
- --network monitoring_network : 이전 docker-compose.yml 에 명시했던 docker network 에서 influxDB 와의 connection 을 위함
- -v : 스크립트를 docker 외부에서 설정하고 끌어오기 때문에 마운트 설정
- --out influxdb=http://influxdb:8086/metrics : 테스트 결과를 InfluxDB 로 저장
- `/scripts/${팀명}/test-script.js` : 마운트한 디렉토리에서 (${docker 외부에서 마운트할 디렉토리}/load-test) ${팀명}/test-script.js 를 실행함을 알린다.

각 개발자는 `${docker 외부에서 마운트할 디렉토리}/load-test/${팀명}` 디렉토리에서 스크립트를 작성하고, 위 명령어에서 ${팀명}/test-script.js 대신 팀명과 본인이 작성한 스크립트 명을 넣기만 하면 된다.

터미널에서 실행한 K6 스크립트 결과는 아래 예시와 같이 출력된다.
참고로, K6 는 진행상황과 결과를 InfluxDB 에 1초마다 저장한다.

![](https://velog.velcdn.com/images/mud_cookie/post/ca24afb4-b638-44c0-b0fe-d3dd27cb1b02/image.png)

<br>

#### 4.4 Influx DB 저장 확인

Grafana 로 시각화 전에 Influx DB 에 정상적으로 저장됐는지 확인해보자.

```
# docker influxdb 컨테이너 내부로 진입, influx 명령어 사용
docker exec -it influxdb influx

# DATABASES 목록 확인
SHOW DATABASES

# 결과 예시
# docker-compose.yml 의 influxdb 에서 INFLUXDB_DB=metrics 을 설정했음을 기억하자.
# name: databases
# name
# ----
# metrics
# _internal


# metrics DATABASE 사용
USE metrics


# MEASUREMENT 목록 확인. 수집된 컬럼들이 존재해야 한다.
SHOW MEASUREMENTS

# 결과 예시
# name: measurements
# name
# ----
# data_received
# data_sent
# http_req_blocked
# http_req_connecting
# http_req_duration
# http_req_failed
# http_req_receiving
# http_req_sending
# http_req_tls_handshaking
# http_req_waiting
# http_reqs
# iteration_duration
# iterations
# vus
# vus_max


# test-script.js 에서 설정한 team, test_name, group 이라는 tag 값이 잘 저장되었는지 확인
SHOW TAG VALUES WITH KEY = "team"
SHOW TAG VALUES WITH KEY = "test_name"
SHOW TAG VALUES WITH KEY = "group"


# 저장된 값 중 상위 10개 확인 예시 (MEASUREMENT 목록 중 하나를 선택)
SELECT * FROM http_req_connecting LIMIT 10

# 결과 예시
# name: http_req_connecting
# time                expected_response method name                        proto    scenario status test_name     tls_version url                         value
# ----                ----------------- ------ ----                        -----    -------- ------ ---------     ----------- ---                         -----
# 1732982789752285597 true              GET    http://httpbin.test.k6.io   HTTP/1.1 default  308    test-script-1             http://httpbin.test.k6.io   1.085468
# 1732982790340330238 true              GET    https://httpbin.test.k6.io/ HTTP/1.1 default  200    test-script-1 tls1.3      https://httpbin.test.k6.io/ 1.010407
```

<br>

#### 4.5 Grafana K6 DashBoard 적용

기본적으로는 https://grafana.com/grafana/dashboards/2587-k6-load-testing-results/
템플릿을 사용하려 했으나, 테스트 결과가 중첩되는 문제가 발생해 템플릿을 조금 커스텀했다.

DashBoard 의 variabels 에 team, test_name, group 을 추가하고,
SHOW TAG VALUES WITH KEY = "team" 
SHOW TAG VALUES WITH KEY = "test_name" 
SHOW TAG VALUES WITH KEY = "group" 
값을 넣었다.
이후 DashBoard 의 각 패널에서 test_name 변수 값을 기준으로 아래와 같은 WHERE 조건문을 넣었다.
`WEHRE team =~ /^$team$/ AND test_name =~ /^$test_name$/ AND \"group\" =~ /^$group$/ `

그래서 완성된 json 파일은 아래 Github 에 넣어두었다.
`k6 Load Testing Results-with-test_name.json` 코드를 복붙하면 된다.

https://github.com/isckd/integration-monitoring/blob/main/grafana-custom-dashboard/k6%20Load%20Testing%20Results-with-test_name.json

json 파일을 기준으로 DashBoard 를 import 하는 것은 위에서 이미 설명했으므로 생략한다.
import 가 완료되었다면 아래와 같은 화면이 출력된다.

> 내가 커스텀한 것은 team, test_name, group 이라는 변수 값으로, 강조한 박스 안에서 원하는 tean, test_name, group 태그를 선택하면 해당 결과만 출력할 수 있다.
또한 기존 템플릿의 Error Per Second 패널가 보이지 않는 이슈를 해결하고,
최상단에는 총 Http request 수, failed 수, data sent, data received 를,
최하단에는 URL 별로 http_req_duration 값을 Table 형태로 노출시켰다.

![](https://velog.velcdn.com/images/mud_cookie/post/bf4701ac-ae69-4b72-a27d-02633aa261f9/image.png)



DashBoard 를 어떻게 커스텀했는지는 아래에 작성한다.

<br>
<br>

---

<br>
<br>


## Grafana DashBoard 커스텀 방법 (변수 지정)

Grafana DashBoard 커스텀 방법을 알아보자. (내용이 많아 변수 지정만 설명한다.)
크게는 두 가지로 나뉜다.
- UI 에서 변경하는 방법
- Json 코드를 변경하는 방법

UI 에서 변경하면, 자동으로 Json 코드도 변경된다.
단순 반복적인 InfluxDB 쿼리 변경이라고 하면, UI 에서 필요없이 Json 코드에서 변경해도 무방하다.

내가 커스텀한 내용을 기반으로 진행해보자.
필요한 것은 K6 테스트 스크립트 별로 유니크한 태그 값이 필요한 상황이므로, 
K6 테스트 스크립트 안에 tag 값을 집어넣는다.

```
// #test-Script.js
import ...

export let options = {
    tags: {                            // 태그 추가
      team : 'server2',
      test_name: 'test-script-2' 
  	}, 
};

export default function () {
  group('GET /api/books', function () {
  	...
  }
  group('POST /api/books', function () {
  	...
  }
}
```

이 team, test_name, group 이라는 InfluxDB 값이 저장되었으므로, Grafana 에서 불러와야 한다.
K6 Grafana DashBoard 에 진입해 우측 상단의 Edit -> Settings 에 진입한다.

![](https://velog.velcdn.com/images/mud_cookie/post/23b290a8-c73e-4241-9645-4c018b276fcd/image.png)

![](https://velog.velcdn.com/images/mud_cookie/post/75dc8f3c-d705-4c03-b7d8-363526d00057/image.png)

이후 Variables 탭 -> New variable 으로 진입한다.

![](https://velog.velcdn.com/images/mud_cookie/post/01964b5d-39b5-4ca2-9da9-8cb6aec94e9d/image.png)

아래 번호에 맞게 진행한다. 여기서는 test_name 만 진행했지만, team 과 group 도 반복해 진행하자.
1. InfluxDB 에서 Query 로 가져올 것이므로 Query 를 선택한다.
2. 변수의 명을 지정한다.
3. Data source 를 InfluxDB 로 지정한다.
4. 변수들을 가져올 쿼리명을 지정한다. 이번에는 
`SHOW TAG VALUES WITH KEY = "test_name"` 와 같이 TAG 를 가져온다.
5. DashBoard 상단의 변수 선택에서 정렬을 어떻게 할 건지를 지정한다. 입맛에 맞게 진행한다.
6. Multi-value : 다중 선택이 가능한지를 묻는다.
Include All option : All(전체 선택) 옵션이 가능한지를 묻는다.
7. 현재 DashBoard 에 변수로 보여질 값들이 노출된다. 6. 번에서 All 옵션을 선택했으므로 All 변수도 추가된다.

![](https://velog.velcdn.com/images/mud_cookie/post/b042d7b2-06eb-4ffc-93c2-4ef1b1185c24/image.png)

** group 변수의 Query 는 아래와 같이 진행하자. 확인해보니 ::setup, ::teardown 과 같은 메서드들도 group 에 포함되니 정규식으로 제거하자.
`SHOW TAG VALUES WITH KEY = "group" WHERE "group" !~ /^::(setup|teardown)$/` **

<br>

다시 DashBoard 탭으로 돌아와서, 아직 Save dashboard 로 따로 저장하지 않은 상태임에도 Grafana에서 저장 전 실시간 DashBoard 업데이트한 화면을 보여준다. 
아래 화면과 같이 test_name 이라는 변수들이 잘 노출됨을 보여준다.

![](https://velog.velcdn.com/images/mud_cookie/post/4624b47f-6b0d-47fc-8d62-98f825db7bd4/image.png)

아직 끝이 아니다. 각 패널들에 변수 WHERE 조건을 추가해주어야 한다.
각 패널들도 결국 InfluxDB 에서 값을 조회해서 노출해주는 것일 뿐이다.
먼저 패널 하나를 선택해 쿼리를 지정하는 방법을 알아보자.

### 1. UI 에서 패널별로 커스텀하는 방법

패널에 마우스를 올리면 메뉴 바가 노출되고, 그것을 클릭해 Edit 탭으로 진입한다.

![](https://velog.velcdn.com/images/mud_cookie/post/5eaa9488-738c-4298-b516-267e0a05c5d8/image.png)

이후 쿼리 수정 버튼을 눌러 쿼리를 수정하자.

![](https://velog.velcdn.com/images/mud_cookie/post/e826660e-c159-4d91-89fe-7ae93f592e45/image.png)

기존에는 `SELECT mean("value") FROM "vus" WHERE $timeFilter GROUP BY time($__interval) fill(none)` 처럼 되어 있었지만, 
여기서 WHERE 절 뒤에`test_name =~ /^$test_name$/ AND` 절을 추가하자.
결론적으로 
`SELECT mean("value") FROM "vus" WHERE test_name =~ /^$test_name$/ AND $timeFilter GROUP BY time($__interval) fill(none)`
와 같이 수정하면 된다.

이후 상단의 test_name 변수값을 조정하며 정상적으로 노출되는지 확인한다.

![](https://velog.velcdn.com/images/mud_cookie/post/64db4c7b-5590-4375-85d4-5693c118689b/image.png)

<br>

### 2. Json 에서 일괄 적용하는 방법

다시 Settings 탭으로 돌아와 JSON Model 탭에서 Json 코드를 수정해보자.

![](https://velog.velcdn.com/images/mud_cookie/post/e8bfeda7-a215-4fc6-b18c-a5182a52c513/image.png)

단순 작업이므로 JSON 코드에서 `WHEHE ` 이라는 문자열을
`team =~ /^$team$/ AND test_name =~ /^$test_name$/ AND \"group\" =~ /^$group$/ ` 으로 일괄 변경하고 저장하자.
저장은 좌측 하단의 Save dashboard 로 저장해야 한다.

> 내가 커스텀한 panel 들 중 아래 세 개는 Group 설정이 적용되지 않아 InfluxDB 쿼리에서 조건을 제거했음을 참고하자. K6 자체에서 아래 메타데이터들은 Group 설정이 적용되지 않는다.
- Data Sent
- Data Received
- virtual Users


Grafana DashBoard 커스텀 방법 중 변수 설정만 작성했지만,
이외 커스텀한 panel 을 만드는 방법은 기능이 워낙 많고 복잡해서 이 글 안에 전부 소개하기에는 무리가 있다.

차후 기회가 된다면 DashBoard 커스텀 방법을 소개할 예정이다.
그 전에 비슷한 화면을 구현하고자 한다면, 
https://grafana.com/docs/grafana/latest/dashboards/
위 문서를 참고하거나 panel 들을 복사해서 사용하길 바란다.
참고로 내용이 너무 방대해서 학습하는 데 시간을 쏟는게 조금 아깝기는 하다..

<br>
<br>

---

<br>
<br>


## 이외 추가 Exporter 적용사항

위 Spring Boot 외 사내 모니터링할만한 도구들은 아래와 같았다.
- rabbitmq
- oracle
- redis
- kafka
- mysql
- elasticsearch

위와 같은 오픈소스들의 metric 들을 수집하기 위해 가장 일반적인 방법이, exporter 를 활용하는 방법이다.
각 도구들의 metric 들을 수집하는 exporter 인스턴스를 띄우고, Prometheus 에서 일괄적으로 metric 들을 수집한 다음 Grafana 에서 시각화 하는 구조이다.

![](https://velog.velcdn.com/images/mud_cookie/post/42ad75c6-4e04-4cd4-b9bd-610e927c3884/image.png)


> 규모가 큰 오픈소스들 (ex : Redis, Elasticsearch, Kafka ...) 들은 Exporter 필요 없이 바로 Prometheus 로 수집이 가능하지만, Exporter 를 적용한 이유를 아래에서 설명한다. <br>
RabbitMQ 만 Exporter 없이 구성했다.

이와 같이 적용하는 방법을 알아보자.

> 위 Grafana, InfluxDB, Prometheus, K6 설치과정에서는 폐쇄망이라 외부에서 docker pull 후 tar 파일로 변환 후 이관, 역변환해 하는 과정이 있었지만 이를 일일이 언급하면 내용이 길어져 아래에서는 생략한다.

각자 필요한 도구들만 선정해 아래 예시와 같이 오픈소스 도구 metric 수집용 docker-compose.yml 을 작성한다.

<br>

### exporter 구성을 위한 docker-compose.yml

```
services:
  oracledb-exporter:
    image: ghcr.io/iamseth/oracledb_exporter:0.6.0
    container_name: oracledb-exporter
    ports:
      - "9161:9161"  # Oracle Exporter 메트릭 엔드포인트
    environment:
      # 특수문자는 인식하지 못하므로 인코딩해 넣어야 한다.
      - DATA_SOURCE_NAME=oralce://${Root권한계정명}:${Root권한계정PW}@${ORACLE_DB_HOST}:${ORACLE_DB_PORT}/${ORACLE_DB_SERVICE_NAME}
    volumes:
      # 커스텀한 metric 수집을 위해 작성한 쿼리파일을 mount	
      - ./oracle/metrics.yaml:/etc/oracledb_exporter/metrics.yaml
    command: ["--custom.metrics", "/etc/oracledb_exporter/metrics.yaml"]
    networks:
      - monitoring_network	# 모니터링 전용 network 이름을 지정    
    restart: unless-stopped      

  redis-exporter:
    image: oliver006/redis_exporter:v1.66.0
    container_name: redis-exporter
    ports:
      - "9121:9121"
    environment:
      - REDIS_ADDR=${REDIS_HOST}:${REDIS_PORT}
      - REDIS_PASSWORD=${REDIS_PW}
    networks:
      - monitoring_network	# 모니터링 전용 network 이름을 지정      

  kafka-exporter:
    image: danielqsj/kafka-exporter:v1.8.0
    container_name: kafka-exporter
    ports:
      - "9308:9308"
    command: ["--kafka.server=${KAFKA_HOST}:${KAFKA_POERT}"]
    networks:
      - monitoring_network	# 모니터링 전용 network 이름을 지정    
    extra_hosts:
      - "${KAFKA_HOST_매핑된_NAME}:${KAFKA_HOST}"      # 컨테이너 내부에서 인식 못하는 ${KAFKA_HOST_매핑된_NAME} 를 ${KAFKA_HOST} 으로 host mapping      

  mysqld-exporter:
    container_name: mysqld-exporter
    image: prom/mysqld-exporter:v0.16.0
    ports:
      - 9104:9104
    command:
      - "--mysqld.username=${MYSQL_ROOT_계정명}:${MYSQL_ROOT_계정_PW}"
      - "--mysqld.address=${MYSQL_HOST}:${MYSQL_PORT}"      
    networks:
      - monitoring_network	# 모니터링 전용 network 이름을 지정      

  elasticsearch-exporter:
    image: quay.io/prometheuscommunity/elasticsearch-exporter:v1.8.0
    container_name: elasticsearch-exporter
    ports:
      - "9114:9114"
    command:
      - '--es.uri=https://${ELASTICSEARCH_ROOT_계정명}:${ELASTICSEARCH_ROOT_PW}@${ELASTICSEARCH_HOST}:${ELASTICSEARCH_PORT}'      # PW 특수문자로 인해 인코딩
      - '--es.ca=/certs/ca.crt'  
      - '--log.level=info'       
    volumes:
      - ./elasticsearch/certs:/certs:ro              # Elasticsearch CA 인증서를 컨테이너에 마운트
    networks:
      - monitoring_network	# 모니터링 전용 network 이름을 지정      
    extra_hosts:
      - "${ELASTICSEARCH_HOST_매핑된_NAME}:${ELASTICSEARCH_HOST}"      # 컨테이너 내부에서 인식 못하는 ${ELASTICSEARCH_HOST_매핑된_NAME} 를 ${ELASTICSEARCH_HOST} 으로 host mapping      

networks:				# 모니터링 전용 network 이름을 지정
  monitoring_network:
    external: true
```

<br>

특이사항은 아래와 같다.
- 기존 prometheus, influxDB, grafana 등이 존재하는 docker compose 의 네트워크와 연동한다.
- container 내부에서 host name 매핑이 필요한 경우 (kafka, elasticsearch) 등은 extra_hosts 로 적용한다.
- elasticsearch 의 경우 8.x ver 부터 ssl/tls 인증이 필수이므로, 인증서 파일 (.crt) 파일이 필요하다.
- environment: 변수가 아닌 command: 에 변수를 넣는 경우 특수문자를 지원하지 않으므로 인코딩해 넣어야 한다.

<br>

각 exporter 를 선정한 기준은 아래와 같다.
- `oracledb-exporter` : Oracle DB 모니터링 툴 검색 결과 오픈소스들이 거의 없었다. 애초에 OracleDB 는 enterprise 용으로 많이 쓰여서 그런 것으로 예상된다.
그래서 Prometheus 와 연동되고, Grafana DashBoard 가 존재하는 oracle-exporter 를 https://github.com/iamseth/oracledb_exporter 에서 선택했다.
그나마 Github Star 수가 높고, 내가 커스텀한 SQL 로 Metric 들을 수집할 수 있다는 것에 선택했다.
- `redis-exporter` : Redis 는 기본적으로 Grafana 자체에서 Prometheus 없이 기초적인 metric 수집이 가능하다. 하지만 실시간 metric 만 수집할 뿐 과거 데이터는 Redis 자체에서 보유하고 있지 않으므로 상당히 제한적인 정보만 얻을 수 있었다.
그래서 그런지 redis-exporter 관련해 https://github.com/oliver006/redis_exporter 를 보면 사용자가 꽤 많은 것을 확인할 수 있었고, 이를 택했다.
- `kafka-exporter` : kafka 는 사실 Grafana 에서 모니터링하는 것보다 플러그인으로 제공하는 모니터링 툴을 사용하는 것이 더 일반적이다. 그래도 Grafana 에서 시각화해보기 위해 이것저것 방법을 알아본 결과, Kafka 에서 Kminion 으로 Kafka 도메인 수준의 정보를 모니터링 + jmx 로 JVM 수준의 모니터링으로 시각화하는 방법이 존재했다.
하지만 Kminion, jmx 설정을 적용하기 위해선 Kafka 설정 변경 후 재기동해야되는데, 나에게는 Kafka 서버 접근 권한이 없어 이 방법은 제한되었다.
어쩔 수 없이 kafka 에서 기본적으로 제공하는 제한적인 정보들만 수집하는 https://github.com/danielqsj/kafka_exporter 를 택했다.
- `mysqld-exporter` : MySQL 은 오픈소스인 만큼 많은 Metric 수집 도구들이 존재했다. 그 중에서 prometheus 커뮤니티에서 제공하는 https://hub.docker.com/r/prom/mysqld-exporter 를 택했다.
- `elasticsearch-exporter` : Elasticsearch Stack 중에 메트릭을 수집해 시각화 하는 도구가 자체적으로 존재하기도 하지만, 이는 기존 설정을 변경 후 재설치 해야되는 과정이 있으므로 제외한다. 또한 Elasticsearch 는 Grafana 와의 호환성이 매우 좋아 Prometheus 연동없이 Grafana 내부에서 Datasource conneciton 으로 바로 연동해 모니터링이 가능하다.
하지만 현 폐쇄망에 설치된 Elasticsearch 는 7.9 ver 이고, 이번에 설치한 Grafana 11.3.1 에서는 7.15 ver 이상만 지원하는 바람에 어쩔 수 없이 elasticsearch-exporter 를 사용했다.
만약 다른 환경이라면, Prometheus 없이 바로 시각화 하는 방법을 추천한다. 내가 선택한 exporter 는 https://quay.io/repository/prometheuscommunity/elasticsearch-exporter 이다.
	
<br>

rabbitmq 는 Grafana 와의 호환성이 뛰어나고, 재기동 필요없이 플러그인 설정 적용만해도 바로 시각화가 가능하다. 
https://grafana.com/grafana/dashboards/10991-rabbitmq-overview/
에서는 RabbitmQ 3.8.0 이상의 버전부터는 기본적으로 Prometheus 플러그인이 내장되어있다고 기재되어있다.

아래 그 방법을 소개한다.
linux 유저의 권한이 sudo 를 가지고 있거나, rabbitmq 라는 유저명으로 실행할 수 있는 환경이여야 한다.

```
# 아래에서 rabbitmq_prometheus 플러그인을 먼저 downlaod 한다.
https://github.com/rabbitmq/rabbitmq-server/releases/download/${rabbitmq_version}/rabbitmq_prometheus-${rabbitmq_version}.ez

# 해당 파일을 rabbitmq plugin 디렉토리로 이관한다.
sudo mv rabbitmq_prometheus-{rabbitmq_version}.ez /usr/lib/rabbitmq/lib/rabbitmq_server-{rabbitmq_version}/plugins/

# rabbitmq_prometheus 플러그인을 활성화한다.
rabbitmq-plugins enable rabbitmq_prometheus
```

<br>

### Exporter -> Prometheus Metric 수집을 위한 prometheus.yml

위 exporter 및 rabbitmq metric 들을 prometheus 에서 수집하기 위한 prometheus.yml 을 작성한다.
`promteheus.yml 에서는 OS 의 .env 와 같은 변수들이 적용되지 않으므로 참고하자.`

```
global:
  scrape_interval: 5s # 메트릭 수집 주기

scrape_configs:

# Spring Boot 인스턴스, prometheus 기본 metric 등 나머지 내용들...
...

  - job_name: 'rabbitmq'
    static_configs:
      - targets: ['${RABBITMQ_HOST}:15692']  # ${RABBITMQ_HOST} : rabbitmq 의 prometheus 전용 port      

  - job_name: 'oracle'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['oracledb-exporter:9161']  # Oracle Exporter가 실행 중인 호스트와 포트    

  - job_name: 'redis'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['redis-exporter:9121']

  - job_name: 'kafka'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['kafka-exporter:9308']      

  - job_name: 'mysql'
    static_configs:
      - targets: ['mysqld-exporter:9104']

  - job_name: 'elasticsearch'
    static_configs:
      - targets: ['elasticsearch-exporter:9114']      
```

<br>

### exporter 와 연동되는 Grafana Dashboard

Grafana Dashboard 들은 그 종류와 수가 많다.
내가 선택한 Dashboard 말고도 다양한 것이 존재하니, 어떠한 DataSource (prometheus, InfluxDB ...) 를 사용하는지와 버전 호환성 확인 후 다른 것을 골라도 무방하다.

#### oracledb

사내에서는 OracleDB 집중화 되어있어, Dashboard 를 기반으로 필요한 정보들을 커스텀했다.
Dashboard ref : https://grafana.com/grafana/dashboards/13555-oracledb-monitoring-performance-and-table-space-stats/

위 docker-compose.yml 의 oracledb-exporter 컨테이너 설정 내부에 아래처럼 적었었다. 

```
    volumes:
      # 커스텀한 metric 수집을 위해 작성한 쿼리파일을 mount	
      - ./oracle/metrics.yaml:/etc/oracledb_exporter/metrics.yaml
```

이 설정은 기본적으로 exporter 에서 제공되는 metric 외 추가적으로 내가 원하는 것들을 SQL 로 조회해서 prometheus 에 저장할 수 있게 하는 외부의 설정파일을 mount 하겠다는 의미이다.

해당 exporter 는 custom metric 수집을 위해 .toml, .yaml 파일 설정을 지원하는데, 익숙한 .yaml 으로 설정했다.
https://github.com/iamseth/oracledb_exporter/blob/master/custom-metrics-example/custom-metrics.yaml
가 그 .yaml 파일 설정 예시이다.

해당 github 에는 각 필드들에 대한 설명이 없어 직접 시행착오를 겪으면서 깨달은 의미를 간략하게 설명한다.
- context: Prometheus 에 저장될 때 붙을 이름의 prefix
- metricsdesc: 좌측의 값은 Prometheus 에 저장될 때 붙을 이름의 suffix. request 에서 조회된 값을 매칭해 실제 값을 `외부에` 저장하며, Prometheus 특성 상 실제 값에는 문자열이 들어가지 못하고, 숫자만 들어갈 수 있음에 유의하자.
metricsdesc 가 여러개면 그 개수만큼 데이터 row가 생성된다.
우측의 값은 해당값의 description 을 의미한다.
- labels: Prometheus 에 저장될 때 `내부에` 저장될 labels 값. request 에서 조회된 값을 매칭해 실제 값을 `내부에` 저장하며, 문자열도 저장이 가능하다.
labels 가 여러개여도 하나의 데이터 row 안에 들어간다.
- request: 실제 조회할 SQL 을 의미한다. 추출된 값들은 metricsdesc, labels 에 매핑된다.


아래 Prometheus 데이터 값으로 간단한 예시를 보자.
`# HELP` 에는 metricsdesc 내부 각각의 값에서 우측의 값이 들어간다.
`job, instance` 는 각각 labels 들이다. 하나의 row 에 여러 개의 값이 들어간다.
`85.7`, `65.3` 은 각각 row 에 대한 숫자 값이다. 

```
# HELP cpu_usage CPU usage in percentage
# TYPE cpu_usage gauge
cpu_usage{job="app-server", instance="10.0.0.1"} 85.7
cpu_usage{job="app-server", instance="10.0.0.2"} 65.3
```


내가 직접 커스텀한 grafana dashboard json 파일은 아래에 넣어두었다.

https://github.com/isckd/integration-monitoring/blob/main/grafana-custom-dashboard/OracleDB%20Monitoring%20-%20performance%20and%20table%20space%20stats-1734088562418.json

아래는 내가 커스텀한 DashBoard 를 캡처한 화면이다.
`Custom Panel - ` 로 시작하는 Panel 은 내가 커스텀한 것이다.
문제 요소가 될 만한 것들은 캡처 이미지에서 제외했다.

Oracle 과 같은 RDMBS 에서 성능적으로 중요하게 봐야 할 요소들이 많다.
SQL 캐싱이 잘 되었는지, full scan 이 되었는지, 몇 번이나 수행됐는지, cpu 사용률은 얼마나 되는지 등.. 고려할 요소가 많다.

그래서 아래 필드들을 중점적으로 모니터링할 수 있게 했다.
- `OS_CPU_USAGE_%` : OracleDB 가 수행되는 Host OS 의 CPU 자원 사용률
- `OS_MEMORY_USAGE_%`: OracleDB 가 수행되는 Host OS 의 MEMORY 자원 사용률
- `URRENT_MEMORY`: OracleDB 가 수행되는 Host OS 의 사용중인 MEMORY (gb), 사용 가능한 MEMORY (gb) 을 현재 시간 기준으로 노출.
• `sid` : 세션을 고유하게 식별하는 ID
• `serial#` : 세션의 고유 시리얼 넘버. 세션 종료 후 재사용될 경우를 대비해 추가로 사용됨.
• `machine` : 세션이 연결된 클라이언트의 host name
• `program` : 세션을 시작한 application name (SQLPlus, JDBC Driver ... )
• `osuser` : 세션을 실행 중인 클라이언트의 OS user name
• `elapsed_seconds` : SQL 문이 실행된 지 경과한 시간 (unit : second)
• `sql_id` : 실행 중인 SQL 문을 고유하게 식별하는 ID. 일반적으로 WHERE 절에 들어가는 바인딩 변수는 제외한 구문이다.
• `plan_hash_value` : 실행 계획을 나타내는 Hash 값. 동일한 SQL 문이라도 바인딩 변수, 데이터 분포에 따라 인덱스 스캔이 다르게 되어 실행계획이분리될 수 있다.
세부적으로는 Buffer Cache, Shared Pool 등 메모리 사용량 및 SQL Hint, 파티셔닝, Curosr(커서) Sharing 등의 여부에 따라 변경될 수 있다.
• `executions` : SQL 실행 수
• `buffer_gets` : Logical l/O 수행 수 (많으면 인덱스 최적화)
• `disk_reads`: Physical I/O 수행 수 (많으면 캐싱 / 데이터 접근 패턴 점검)
• `cpu_time`: SQL 문이 실행 중 CPU 를 사용한 총 시간 (micro second)
• `elapsed_time`: SQL 문이 실행을 완료하는 데 소요된 총 시간 (micro second).
cpu_time 뿐 아니라 I/O, Lock 대기, 컨텍스트 스위칭 등의 시간이 포함된다.
• `cpu_ratio`: SQL 문이 총 CPU 자원에서 차지한 비율
• `elapsed_time_ratio`: SQL 문이 전체 실행 시간(Elapsed Time)에서 차지한 비율

![](https://velog.velcdn.com/images/mud_cookie/post/12248ad8-a448-4f95-b5be-dc7997f11eb0/image.png)



#### redis
기본 Dashboard 사용.
Dashboard ref : https://grafana.com/grafana/dashboards/11835-redis-dashboard-for-prometheus-redis-exporter-helm-stable-redis-ha/

![](https://velog.velcdn.com/images/mud_cookie/post/3afe0928-7d47-4cfa-8177-7f03ec32a9cb/image.png)


#### kafka
기본 Dashboard 사용.
Dashboard ref : https://grafana.com/grafana/dashboards/7589-kafka-exporter-overview/

![](https://velog.velcdn.com/images/mud_cookie/post/1fab638f-14d7-4b44-9d67-9c34b9c9a59b/image.png)


#### mysqld
사내에서는 OracleDB 를 주력으로 사용하므로 커스텀 없이 기본 Dashboard 사용.
Dashboard ref : https://grafana.com/grafana/dashboards/14057-mysql/

![](https://velog.velcdn.com/images/mud_cookie/post/a6209c75-30f7-47f1-994d-a5e3ae5669cf/image.png)


#### elasticsearch
기본 Dashboard 사용.
Dashboard ref : 
https://grafana.com/grafana/dashboards/14191-elasticsearch-overview/

![](https://velog.velcdn.com/images/mud_cookie/post/31947f1a-fa9e-46fd-9be0-fcb065a7a401/image.png)


#### rabbitmq
기본 Dashboard 사용. RabbitMQ 자체 내장된 플러그인과 호환된다.
Dashboard ref : 
https://grafana.com/grafana/dashboards/10991-rabbitmq-overview/

![](https://velog.velcdn.com/images/mud_cookie/post/ad4bd3b3-0db8-4b38-8df2-fcad55cd9f4e/image.png)


---

<br>
<br>


> 관련해 추가로 작성한 포스트
- [K6 부하테스트 스크립트 작성법](https://velog.io/@mud_cookie/K6-%EB%B6%80%ED%95%98%ED%85%8C%EC%8A%A4%ED%8A%B8-%EC%8A%A4%ED%81%AC%EB%A6%BD%ED%8A%B8-%EC%9E%91%EC%84%B1%EB%B2%95)
- [코루틴이란](https://velog.io/@mud_cookie/%EC%BD%94%EB%A3%A8%ED%8B%B4%EC%9D%B4%EB%9E%80)
