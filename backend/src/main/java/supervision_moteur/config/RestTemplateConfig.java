package supervision_moteur.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

@Configuration
public class RestTemplateConfig {

    @Value("${ai.service.connect-timeout-ms:5000}")
    private long connectTimeout;

    @Value("${ai.service.read-timeout-ms:30000}")
    private long readTimeout;

    @Bean
    public RestTemplate restTemplate() {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Math.toIntExact(connectTimeout));
        requestFactory.setReadTimeout(Math.toIntExact(readTimeout));
        return new RestTemplate(requestFactory);
    }
}
