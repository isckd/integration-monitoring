# k6 부하테스트는 아래 명령어로 실행한다.
# /home/monitoring/docker/load-test/scripts:/scripts 을 마운트해서, sp2/dap-dev1.js 파일을 실행한다는 의미이다.
docker run --rm --network monitoring_network \
    -v /home/monitoring/docker/load-test/scripts:/scripts \
    grafana/k6:0.55.0 run \
    --out influxdb=http://influxdb:8086/metrics \
    /scripts/sp2/test-script.js

docker exec -it influxdb influx
> USE metrics;
> SHOW MEASUREMENTS; 